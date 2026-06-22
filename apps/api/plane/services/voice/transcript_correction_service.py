# Copyright (c) 2023-present Plane Software, Inc. and contributors
# SPDX-License-Identifier: AGPL-3.0-only
# See the LICENSE file for details.

"""Developer Vocabulary Correction Layer.

Sits between the raw Whisper transcript and ticket generation:

    Audio -> Whisper Transcript -> Developer Vocabulary Correction -> Ticket Generation

Whisper mis-hears software-engineering terminology in consistent, recognizable ways
("in voice" for "invoice", "friend the end" for "frontend", "APD" for "API"). This module
only repairs known/high-confidence technical-term mishearings - it never rewrites sentence
structure, fixes unrelated words, or invents content that wasn't said.
"""

import difflib
import json
import logging
import re

logger = logging.getLogger("plane.voice")

# Deterministic, high-confidence phrase-level fixes for specific known Whisper mishearings of
# dev vocabulary. Checked first and take priority over fuzzy matching below. Longer/more-specific
# patterns are listed first so they aren't pre-empted by a shorter overlapping pattern.
#
# Multi-word patterns use \W+ (one or more non-word characters) between words instead of a
# literal space, so a pause or punctuation Whisper inserts between words ("payment, issue",
# "payment - issue", "payment     issue") still matches the same known mishearing.
PHRASE_CORRECTIONS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bdocker\W+container\W+help\W+check\b", re.IGNORECASE), "docker container health check"),
    (re.compile(r"\bin\W+voice\b", re.IGNORECASE), "invoice"),
    (re.compile(r"\bpayment\W+issue\b", re.IGNORECASE), "parent issue"),
    (re.compile(r"\bfriend\W+the\W+end\b", re.IGNORECASE), "frontend"),
    (re.compile(r"\bfriend\W+end\b", re.IGNORECASE), "frontend"),
    (re.compile(r"\bback\W+end\b", re.IGNORECASE), "backend"),
    (re.compile(r"\bAPD\b"), "API"),
    (re.compile(r"\bhelp\W+check\b", re.IGNORECASE), "health check"),
    (re.compile(r"\bdata\W+page\b", re.IGNORECASE), "database"),
    (re.compile(r"\bstar\W+cut\b", re.IGNORECASE), "startup"),
    (re.compile(r"\bweb\W*socket\b", re.IGNORECASE), "WebSocket"),
    (re.compile(r"\bgraph\W*q\W*l\b", re.IGNORECASE), "GraphQL"),
    (re.compile(r"\bpostgress\b", re.IGNORECASE), "PostgreSQL"),
    (re.compile(r"\bjwt\b", re.IGNORECASE), "JWT"),
    (re.compile(r"\bci\W*cd\b", re.IGNORECASE), "CI/CD"),
]

# Canonical software-engineering vocabulary used for fuzzy matching. Multi-word entries are
# matched as a phrase window; everything is matched against 1-3 token windows so multi-token
# mishearings of a single-word term (e.g. "cube net ease" -> Kubernetes) are caught too.
DICTIONARY = [
    "Frontend", "Backend", "API", "Database", "Authentication", "Authorization",
    "JWT", "OAuth", "Docker", "Kubernetes", "GraphQL", "PostgreSQL", "MySQL",
    "Redis", "Nginx", "WebSocket", "CI/CD", "Deployment", "Migration", "Invoice",
    "Validation", "Analytics", "Dashboard",
    "CSV", "Export", "Mobile App", "Android", "iOS", "Crash", "Timeout",
    "Latency", "Dependency",
]

# Workflow-specific Plane entities ("Parent Issue", "Cycle Assignment") are intentionally NOT in
# DICTIONARY above, so generic fuzzy matching can never produce them. Fuzzy similarity on short,
# ordinary-word phrases is too easy to satisfy by accident (e.g. "urgent issue" ~ "Parent Issue"
# at ratio 0.82, well past _FUZZY_THRESHOLD) and would silently turn plain English into a
# project-management concept the speaker never said. These terms are only ever produced by exact,
# known Whisper mishearings in PHRASE_CORRECTIONS above (e.g. "payment issue" -> "parent issue").

# Acronyms/very short terms are excluded from fuzzy matching - at that length, near-arbitrary
# words can cross a similarity threshold, risking false positives. They're already covered by
# the deterministic PHRASE_CORRECTIONS list above (APD -> API, jwt -> JWT, ci cd -> CI/CD).
_FUZZY_EXCLUDED_TERMS = {"JWT", "CI/CD", "API", "CSV", "iOS"}
_FUZZY_MIN_NORMALIZED_LENGTH = 4
_FUZZY_THRESHOLD = 0.72
_MAX_WINDOW_TOKENS = 3

# A mishearing splits/merges syllables but doesn't add or drop whole unrelated words, so a
# genuine match's normalized length stays close to the canonical term's length. Without this,
# SequenceMatcher's ratio is inflated by partial/prefix overlap (e.g. "backend api" scores high
# against "backend" alone), which would delete or invent words outside the actual mishearing.
_FUZZY_LENGTH_RATIO_BOUNDS = (0.85, 1.15)

_WORD_RE = re.compile(r"[A-Za-z0-9']+")


def _normalize(text: str) -> str:
    """Lowercases and strips everything but letters/digits, so spacing, punctuation, and
    case differences ("graph q l" vs "GraphQL") don't affect comparison."""
    return re.sub(r"[^a-z0-9]", "", text.lower())


_FUZZY_TERMS = [
    term for term in DICTIONARY
    if term not in _FUZZY_EXCLUDED_TERMS and len(_normalize(term)) >= _FUZZY_MIN_NORMALIZED_LENGTH
]


def apply_phrase_corrections(text: str) -> tuple[str, list[dict]]:
    """Applies the deterministic known-mishearing fixes. Safe by construction: each pattern
    matches one specific known mishearing and replaces it with exactly one known term."""
    corrected = text
    applied: list[dict] = []

    for pattern, replacement in PHRASE_CORRECTIONS:
        def _record(match, replacement=replacement):
            applied.append({"from": match.group(0), "to": replacement})
            return replacement

        corrected = pattern.sub(_record, corrected)

    return corrected, applied


def apply_fuzzy_corrections(text: str) -> tuple[str, list[dict]]:
    """Slides a 1-3 token window across the transcript and replaces a window with a dictionary
    term only when normalized similarity is high (>= _FUZZY_THRESHOLD) - the speech-to-text
    equivalent of a likely mishearing, not a vague resemblance. A window that already matches a
    dictionary term (modulo case/spacing) is left untouched."""
    tokens = list(_WORD_RE.finditer(text))
    applied: list[dict] = []
    replacements: list[tuple[int, int, str]] = []

    i = 0
    while i < len(tokens):
        consumed = 1
        for window_size in range(_MAX_WINDOW_TOKENS, 0, -1):
            if i + window_size > len(tokens):
                continue
            window_tokens = tokens[i : i + window_size]
            window_text = " ".join(t.group(0) for t in window_tokens)
            normalized_window = _normalize(window_text)
            if not normalized_window:
                continue

            already_correct = any(normalized_window == _normalize(term) for term in DICTIONARY)
            if already_correct:
                break

            best_term, best_ratio = None, 0.0
            for term in _FUZZY_TERMS:
                # Multi-word canonical terms ("Mobile App", "Parent Issue") must match a window
                # of the same word count - a single bare word ("mobile") must not expand into a
                # phrase that adds words the speaker never said.
                term_word_count = len(term.split())
                if term_word_count > 1 and window_size != term_word_count:
                    continue

                normalized_term = _normalize(term)
                length_ratio = len(normalized_window) / len(normalized_term)
                if not (_FUZZY_LENGTH_RATIO_BOUNDS[0] <= length_ratio <= _FUZZY_LENGTH_RATIO_BOUNDS[1]):
                    continue

                ratio = difflib.SequenceMatcher(None, normalized_window, normalized_term).ratio()
                if ratio > best_ratio:
                    best_term, best_ratio = term, ratio

            if best_term and best_ratio >= _FUZZY_THRESHOLD:
                start, end = window_tokens[0].start(), window_tokens[-1].end()
                replacements.append((start, end, best_term))
                applied.append({"from": window_text, "to": best_term})
                consumed = window_size
                break
        i += consumed

    corrected = text
    for start, end, replacement in sorted(replacements, key=lambda r: r[0], reverse=True):
        corrected = corrected[:start] + replacement + corrected[end:]

    return corrected, applied


def correct_transcript(text: str) -> tuple[str, list[dict]]:
    """Runs the full correction layer: deterministic phrase fixes, then fuzzy dictionary
    matching. Returns (corrected_text, corrections_applied). Never touches text outside of
    recognized technical-term mishearings, so ticket content/meaning is preserved."""
    if not text:
        return text, []

    corrected, phrase_corrections = apply_phrase_corrections(text)
    corrected, fuzzy_corrections = apply_fuzzy_corrections(corrected)
    applied = phrase_corrections + fuzzy_corrections

    if applied:
        logger.info("voice_ticket.correction original_transcript=%r", text)
        logger.info("voice_ticket.correction corrected_transcript=%r", corrected)
        logger.info("voice_ticket.correction corrections_applied=%s", json.dumps(applied))

    return corrected, applied

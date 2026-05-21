/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// components
import { PageHead } from "@/components/core/page-title";
// hooks
import { useWorkspace } from "@/hooks/store/use-workspace";

function TemplatesPage() {
  // store
  const { currentWorkspace } = useWorkspace();
  // derived values
  const pageTitle = currentWorkspace?.name ? `${currentWorkspace?.name} - Templates` : undefined;

  return (
    <>
      <PageHead title={pageTitle} />
      <div className="flex h-full w-full items-center justify-center bg-white px-6 py-10 text-center">
        <div className="flex max-w-sm -translate-y-6 flex-col items-center gap-3 sm:-translate-y-8">
          <svg
            className="mb-1 h-auto w-[220px] max-w-[70vw]"
            viewBox="0 0 260 180"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M84.5 148.5C113.5 155 167 155 195 148.5" stroke="#DADADA" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M92 37.5C104 17.5 131 15 149.5 31.5C162.5 43 178 42 190.5 45C209 49.5 220 67 214 89C207.5 112.5 180.5 128 148 128.5C116 129 86 119.5 75.5 96.5C66 75.5 78.5 59.5 92 37.5Z"
              fill="#F5F5F5"
            />
            <path d="M55 137.5H209" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M80 85H193" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M89 85V137" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M184 85V137" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M102 85V137" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
            <path d="M171 85V137" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
            <rect x="70" y="56" width="132" height="32" rx="5" fill="white" stroke="#1F1F1F" strokeWidth="2" />
            <path d="M85 88L116 56" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M126 88L157 56" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M167 88L198 56" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M72 75L91 56" stroke="#BDBDBD" strokeWidth="8" strokeLinecap="round" />
            <path d="M113 88L145 56" stroke="#BDBDBD" strokeWidth="8" strokeLinecap="round" />
            <path d="M154 88L186 56" stroke="#BDBDBD" strokeWidth="8" strokeLinecap="round" />
            <path d="M196 88L202 82" stroke="#BDBDBD" strokeWidth="8" strokeLinecap="round" />
            <rect x="104" y="92" width="66" height="36" rx="4" fill="white" stroke="#1F1F1F" strokeWidth="2" />
            <path d="M117 92V84" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M157 92V84" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M121 108H153" stroke="#6B6B6B" strokeWidth="2" strokeLinecap="round" />
            <path d="M121 117H144" stroke="#6B6B6B" strokeWidth="2" strokeLinecap="round" />
            <path d="M67 137C63 124 57 115 46 107" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M68 137C73 125 74 114 70 101" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path
              d="M58 122C49 121 42 117 37 111C47 109 54 113 58 122Z"
              fill="white"
              stroke="#1F1F1F"
              strokeWidth="2"
            />
            <path d="M65 115C56 109 51 101 51 92C61 96 67 104 65 115Z" fill="white" stroke="#1F1F1F" strokeWidth="2" />
            <path d="M72 119C78 112 80 105 78 97C70 102 68 110 72 119Z" fill="white" stroke="#1F1F1F" strokeWidth="2" />
            <path d="M97 38V29" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M92.5 33.5H101.5" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M183 35V26" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <path d="M178.5 30.5H187.5" stroke="#1F1F1F" strokeWidth="2" strokeLinecap="round" />
            <circle cx="203" cy="104" r="2" fill="#DADADA" />
          </svg>
          <h1 className="text-3xl tracking-normal leading-tight font-semibold text-[#111111]">Coming Soon</h1>
          <p className="text-sm tracking-normal leading-6 text-[#6B7280]">We&apos;re working on something great.</p>
        </div>
      </div>
    </>
  );
}

export default observer(TemplatesPage);

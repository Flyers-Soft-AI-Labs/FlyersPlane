import {
  Bell,
  Clock,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Rocket,
  Search,
  Ticket,
  type LucideIcon,
} from "lucide-react";

export type TTourStepKey = "dashboard" | "tickets" | "projects" | "templates" | "timesheet" | "search" | "finish";

export type TTourStep = {
  key: TTourStepKey;
  label: string;
  title: string;
  description: string;
  Icon: LucideIcon;
  secondaryIcon?: LucideIcon;
  /** Served from apps/web/public/onboarding/<file>; use 16:9 screenshots, ideally 1600x900 or 1920x1080. */
  screenshot: string;
  buttonLabel?: string;
};

export const TOUR_STEPS: TTourStep[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    title: "Your Workspace Dashboard",
    description: "View recent activity, quick actions, projects, and assigned work from one central dashboard.",
    Icon: LayoutDashboard,
    screenshot: "/onboarding/dashboard.webp",
  },
  {
    key: "tickets",
    label: "Tickets",
    title: "Track Every Ticket",
    description: "Create, assign, prioritize, and manage tickets efficiently throughout their lifecycle.",
    Icon: Ticket,
    screenshot: "/onboarding/tickets.webp",
  },
  {
    key: "projects",
    label: "Projects",
    title: "Organize Projects",
    description: "Manage related work by grouping tickets into projects for better visibility and collaboration.",
    Icon: FolderKanban,
    screenshot: "/onboarding/projects.webp",
  },
  {
    key: "templates",
    label: "Templates",
    title: "Reusable Templates",
    description: "Create and reuse ticket templates to save time and maintain consistency.",
    Icon: FileText,
    screenshot: "/onboarding/templates.webp",
  },
  {
    key: "timesheet",
    label: "Time Sheet",
    title: "Time Sheet Management",
    description: "Log work hours against tickets and maintain accurate productivity records.",
    Icon: Clock,
    screenshot: "/onboarding/timesheet.webp",
  },
  {
    key: "search",
    label: "Search",
    title: "Global Search",
    description: "Instantly find tickets, projects, templates, and other workspace resources.",
    Icon: Search,
    secondaryIcon: Bell,
    screenshot: "/onboarding/search.webp",
  },
  {
    key: "finish",
    label: "Finish",
    title: "You're Ready!",
    description: "Create your first project and start collaborating with your team in FlyersPlane.",
    Icon: Rocket,
    screenshot: "/onboarding/finish.webp",
    buttonLabel: "Create Your First Project",
  },
];

import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpen,
  Target,
  Brain,
  CalendarClock,
  LineChart,
  Timer,
  Trophy,
  GraduationCap,
  HelpCircle,
  FlaskConical,
  Library,
  LogOut,
  LogIn,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";

const main = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Subjects", url: "/subjects", icon: BookOpen },
  { title: "Targets", url: "/targets", icon: Target },
  { title: "AI Prediction", url: "/predictions", icon: Brain },
];

const study = [
  { title: "Study Planner", url: "/planner", icon: CalendarClock },
  { title: "Mock Exams", url: "/exams", icon: FlaskConical },
  { title: "Resources", url: "/resources", icon: Library },
  { title: "Analytics", url: "/analytics", icon: LineChart },
  { title: "Focus Timer", url: "/focus", icon: Timer },
  { title: "Quizzes", url: "/quizzes", icon: HelpCircle },
  { title: "Achievements", url: "/achievements", icon: Trophy },
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isActive = (p: string) => pathname === p;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/50 px-4 py-5">
        <Link to="/" className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl gradient-brand shadow-glow">
            <GraduationCap className="h-5 w-5 text-sidebar-primary-foreground" />
            <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-success ring-2 ring-sidebar" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-display text-base font-bold tracking-tight text-sidebar-foreground">
              VidyaPath
            </span>
            <span className="text-[10px] uppercase tracking-widest text-sidebar-foreground/60">
              SSLC · Karnataka
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Overview</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Study</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {study.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-3">
        <SidebarFooterUser />
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarFooterUser() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  if (!user) {
    return (
      <Button
        asChild
        size="sm"
        variant="outline"
        className="w-full rounded-xl gap-2 group-data-[collapsible=icon]:hidden"
      >
        <Link to="/login">
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      </Button>
    );
  }

  const name = profile?.studentName || profile?.displayName || user.displayName || "Student";
  const sub = profile ? `Class ${profile.classLevel} · Target ${profile.targetScore}%` : user.email;

  return (
    <div className="group-data-[collapsible=icon]:hidden rounded-xl p-3 bg-sidebar-accent/40">
      <Link to="/profile" className="flex items-center gap-2 group">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-foreground shrink-0">
          <UserIcon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sidebar-foreground truncate group-hover:underline">
            {name}
          </div>
          <div className="text-[11px] text-sidebar-foreground/60 truncate">{sub}</div>
        </div>
      </Link>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2 w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground"
        onClick={async () => {
          await signOut();
          toast.success("Signed out");
          navigate({ to: "/login" });
        }}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  );
}
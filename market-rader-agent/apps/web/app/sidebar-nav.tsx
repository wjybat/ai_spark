"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Icon, type IconName } from "./ui/icons";

const NAV: ReadonlyArray<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/countries", label: "Countries", icon: "globe" },
  { href: "/retailers", label: "Retailers", icon: "store" },
  { href: "/evidence", label: "Sources", icon: "database" },
  { href: "/tasks", label: "Tasks", icon: "task" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ icon }: { icon: IconName }): React.JSX.Element {
  return (
    <span className="nav-icon">
      <Icon name={icon} size={19} />
    </span>
  );
}

/** 与参考 UI 一致：当前路由高亮，Agent 打开时高亮 Agent 项。 */
export function SidebarNav(): React.JSX.Element {
  const pathname = usePathname();
  const [agentOpen, setAgentOpen] = useState(false);

  useEffect(() => {
    const onOpen = (): void => setAgentOpen(true);
    const onClose = (): void => setAgentOpen(false);
    window.addEventListener("agent:open", onOpen);
    window.addEventListener("agent:ask", onOpen);
    window.addEventListener("agent:close", onClose);
    return () => {
      window.removeEventListener("agent:open", onOpen);
      window.removeEventListener("agent:ask", onOpen);
      window.removeEventListener("agent:close", onClose);
    };
  }, []);

  return (
    <nav className="nav">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item${!agentOpen && isActive(pathname, item.href) ? " active" : ""}`}
        >
          <NavIcon icon={item.icon} />
          <span>{item.label}</span>
        </Link>
      ))}
      <button
        type="button"
        className={`nav-item${agentOpen ? " active" : ""}`}
        onClick={() => window.dispatchEvent(new CustomEvent("agent:open"))}
      >
        <NavIcon icon="robot" />
        <span>Agent</span>
      </button>
    </nav>
  );
}

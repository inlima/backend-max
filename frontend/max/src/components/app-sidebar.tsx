"use client"

import * as React from "react"
import {
  IconCamera,
  IconDashboard,
  IconDatabase,
  IconFileDescription,
  IconFileWord,
  IconHelp,
  IconInnerShadowTop,
  IconReport,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"

import Link from "next/link"
import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Contatos",
      url: "/contatos",
      icon: IconUsers,
    },
    {
      title: "Processos",
      url: "/processos",
      icon: IconFileDescription,
    },
  ],
  navClouds: [
    {
      title: "WhatsApp",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Conversas Ativas",
          url: "/contatos?status=em_atendimento",
        },
        {
          title: "Histórico",
          url: "/contatos?status=finalizado",
        },
      ],
    },
    {
      title: "Relatórios",
      icon: IconReport,
      url: "#",
      items: [
        {
          title: "Performance",
          url: "/relatorios/performance",
        },
        {
          title: "Satisfação",
          url: "/relatorios/satisfacao",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: IconSettings,
    },
    {
      title: "Ajuda",
      url: "/ajuda",
      icon: IconHelp,
    },
  ],
  documents: [
    {
      name: "Documentos",
      url: "/documentos",
      icon: IconDatabase,
    },
    {
      name: "Modelos",
      url: "/modelos",
      icon: IconFileWord,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Advocacia Direta</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}

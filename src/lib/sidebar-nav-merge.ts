import type {
  SidebarNavChildItem,
  SidebarNavItem,
} from "@/components/shell/sidebar-nav";

/** Dynamische Unterpunkte an einen Sidebar-Eintrag anhängen (z. B. Kontextpfad). */
export function mergeSidebarItemChildren(
  items: SidebarNavItem[],
  itemLabel: string,
  children: SidebarNavChildItem[] | undefined
): SidebarNavItem[] {
  return items.map((item) =>
    item.label === itemLabel
      ? children?.length
        ? { ...item, children }
        : { ...item, children: undefined }
      : item
  );
}

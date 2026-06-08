import { EmployeeShell } from "@/components/shell/employee-shell";

export default function SchulungLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmployeeShell>{children}</EmployeeShell>;
}

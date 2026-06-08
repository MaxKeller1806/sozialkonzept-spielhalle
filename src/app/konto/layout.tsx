import { EmployeeShell } from "@/components/shell/employee-shell";

export default function KontoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmployeeShell>{children}</EmployeeShell>;
}

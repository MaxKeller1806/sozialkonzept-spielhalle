import { CertianoShell } from "@/components/certiano-shell";
import { DocumentTemplateDesigner } from "@/components/certiano/document-template-designer";

export default function CertianoCertificatesPage() {
  return (
    <CertianoShell>
      <DocumentTemplateDesigner />
    </CertianoShell>
  );
}

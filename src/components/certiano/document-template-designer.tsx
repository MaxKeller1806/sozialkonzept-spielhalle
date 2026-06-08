"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button, Card, ErrorMessage, Input, LiveMessage, Textarea } from "@/components/ui";
import { DocumentTemplateSeminarsOverview } from "@/components/certiano/document-template-seminars";
import {
  DEFAULT_SIGNATURE_PERSON_LABEL,
  DEFAULT_SIGNATURE_POSITION_LABEL,
  DOCUMENT_TYPE_LABELS,
  type DocumentTemplateConfig,
  type DocumentType,
  type GlobalDocumentTemplateDetail,
} from "@/lib/document-template-shared";

type MainTab = "templates" | "seminars";

type TemplateListItem = {
  id: number;
  documentType: DocumentType;
  documentTypeLabel: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  draftRevisionId: number | null;
  publishedRevisionId: number | null;
  updatedAt: string;
};

function cloneConfig(config: DocumentTemplateConfig): DocumentTemplateConfig {
  return structuredClone(config);
}

function CheckboxField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2.5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
      {children}
    </h3>
  );
}

function DocumentTemplateEditor() {
  const [documentType, setDocumentType] = useState<DocumentType>("certificate");
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [detail, setDetail] = useState<GlobalDocumentTemplateDetail | null>(null);
  const [formConfig, setFormConfig] = useState<DocumentTemplateConfig | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const activeTemplate = useMemo(
    () => templates.find((t) => t.documentType === documentType) ?? null,
    [templates, documentType]
  );

  const hasDraft = detail?.draftRevision != null;
  const isEditable = hasDraft && formConfig != null;

  const isDirty = useMemo(() => {
    if (!isEditable || !detail?.draftRevision || !formConfig) return false;
    return (
      JSON.stringify(formConfig) !== JSON.stringify(detail.draftRevision.config)
    );
  }, [detail, formConfig, isEditable]);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/superuser/document-templates");
    if (res.status === 403) {
      window.location.replace("/certiano/login");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Vorlagen konnten nicht geladen werden.");
    }
    setTemplates(data.templates ?? []);
  }, []);

  const loadDetail = useCallback(async (templateId: number) => {
    setDetailLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/superuser/document-templates/${templateId}`);
      if (res.status === 403) {
        window.location.replace("/certiano/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Vorlage konnte nicht geladen werden.");
      }
      const loaded = data as GlobalDocumentTemplateDetail;
      setDetail(loaded);
      const sourceConfig =
        loaded.draftRevision?.config ?? loaded.publishedRevision?.config ?? null;
      setFormConfig(sourceConfig ? cloneConfig(sourceConfig) : null);
    } catch (e) {
      setDetail(null);
      setFormConfig(null);
      setError(e instanceof Error ? e.message : "Fehler beim Laden.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadTemplates();
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Fehler beim Laden.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTemplates]);

  useEffect(() => {
    if (!activeTemplate) {
      setDetail(null);
      setFormConfig(null);
      return;
    }
    void loadDetail(activeTemplate.id);
  }, [activeTemplate, loadDetail]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updateConfig(
    patch: Partial<Omit<DocumentTemplateConfig, "visibility" | "signature" | "styling">> & {
      visibility?: Partial<DocumentTemplateConfig["visibility"]>;
      signature?: Partial<DocumentTemplateConfig["signature"]>;
      styling?: Partial<DocumentTemplateConfig["styling"]>;
    }
  ) {
    setFormConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        ...patch,
        visibility: { ...current.visibility, ...patch.visibility },
        signature: { ...current.signature, ...patch.signature },
        styling: { ...current.styling, ...patch.styling },
      };
    });
  }

  async function createDraft() {
    if (!activeTemplate) return;
    setCreatingDraft(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(
        `/api/superuser/document-templates/${activeTemplate.id}/draft`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        window.location.replace("/certiano/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Entwurf konnte nicht erstellt werden.");
      }
      const loaded = data as GlobalDocumentTemplateDetail;
      setDetail(loaded);
      setFormConfig(
        loaded.draftRevision?.config
          ? cloneConfig(loaded.draftRevision.config)
          : null
      );
      setMessage("Entwurf erstellt. Sie können die Vorlage jetzt bearbeiten.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setCreatingDraft(false);
    }
  }

  async function saveDraft(): Promise<boolean> {
    if (!activeTemplate || !formConfig || !hasDraft) return false;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(
        `/api/superuser/document-templates/${activeTemplate.id}/draft`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: formConfig }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        window.location.replace("/certiano/login");
        return false;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Entwurf konnte nicht gespeichert werden.");
      }
      if (data.detail) {
        setDetail(data.detail as GlobalDocumentTemplateDetail);
        const draftConfig = data.draftRevision?.config ?? formConfig;
        setFormConfig(cloneConfig(draftConfig));
      }
      setMessage("Entwurf gespeichert.");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function publishDraft() {
    if (!activeTemplate) return;
    if (isDirty) {
      const saved = await saveDraft();
      if (!saved) return;
    }
    setPublishing(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch(
        `/api/superuser/document-templates/${activeTemplate.id}/publish`,
        { method: "POST" }
      );
      const data = await res.json().catch(() => ({}));
      if (res.status === 403) {
        window.location.replace("/certiano/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? "Veröffentlichen fehlgeschlagen.");
      }
      const loaded = data as GlobalDocumentTemplateDetail;
      setDetail(loaded);
      setFormConfig(
        loaded.publishedRevision?.config
          ? cloneConfig(loaded.publishedRevision.config)
          : null
      );
      setMessage("Vorlage veröffentlicht.");
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setPublishing(false);
    }
  }

  async function refreshPreview() {
    if (!activeTemplate) return;
    setPreviewLoading(true);
    setMessage("");
    setError("");
    try {
      if (hasDraft && isDirty) {
        const saved = await saveDraft();
        if (!saved) return;
      }

      const res = await fetch(
        `/api/superuser/document-templates/${activeTemplate.id}/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useDraft: hasDraft }),
        }
      );
      if (res.status === 403) {
        window.location.replace("/certiano/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Vorschau fehlgeschlagen.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setMessage("Vorschau aktualisiert (synthetische Testdaten).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler.");
    } finally {
      setPreviewLoading(false);
    }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {(["certificate", "proof"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setDocumentType(type)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              documentType === type
                ? "border border-b-white border-slate-200 bg-white text-brand"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {DOCUMENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <LiveMessage message={message} />
      <ErrorMessage message={error} />

      {loading ? (
        <p className="text-sm text-slate-600" role="status">
          Vorlagen werden geladen…
        </p>
      ) : !activeTemplate ? (
        <Card>
          <p className="text-sm text-slate-600">
            Keine globale Vorlage für{" "}
            <strong>{DOCUMENT_TYPE_LABELS[documentType]}</strong> gefunden.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mb-6 border-brand-light bg-brand-light/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">{activeTemplate.name}</p>
                {activeTemplate.description ? (
                  <p className="mt-1 text-sm text-slate-600">
                    {activeTemplate.description}
                  </p>
                ) : null}
                <p className="mt-2 text-sm text-slate-600">
                  {detailLoading
                    ? "Details werden geladen…"
                    : hasDraft
                      ? `Entwurf (Revision ${detail?.draftRevision?.revisionNumber}) – bearbeitbar`
                      : detail?.publishedRevision
                        ? `Veröffentlicht (Revision ${detail.publishedRevision.revisionNumber}) – nur lesbar`
                        : "Keine Revision vorhanden"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!hasDraft ? (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={creatingDraft || detailLoading || !detail?.publishedRevision}
                    onClick={() => void createDraft()}
                  >
                    {creatingDraft ? "Wird erstellt…" : "Neue Version bearbeiten"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saving || !isDirty}
                      onClick={() => void saveDraft()}
                    >
                      {saving ? "Speichern…" : "Entwurf speichern"}
                    </Button>
                    <Button
                      type="button"
                      disabled={publishing}
                      onClick={() => void publishDraft()}
                    >
                      {publishing ? "Veröffentlichen…" : "Veröffentlichen"}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Bereits ausgestellte Dokumente behalten die Version, die zum
              Ausstellungszeitpunkt veröffentlicht war.
            </p>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="space-y-6">
              {!formConfig ? (
                <p className="text-sm text-slate-600">Keine Konfiguration verfügbar.</p>
              ) : (
                <>
                  <section>
                    <SectionTitle>Texte</SectionTitle>
                    <div className="space-y-4">
                      <Input
                        label="Titel"
                        value={formConfig.title}
                        disabled={!isEditable}
                        onChange={(e) => updateConfig({ title: e.target.value })}
                      />
                      <Input
                        label="Untertitel"
                        value={formConfig.subtitle}
                        disabled={!isEditable}
                        onChange={(e) => updateConfig({ subtitle: e.target.value })}
                      />
                      <Textarea
                        label="Beschreibungstext"
                        value={formConfig.bodyText}
                        disabled={!isEditable}
                        onChange={(e) => updateConfig({ bodyText: e.target.value })}
                      />
                      <Input
                        label="Fußtext"
                        value={formConfig.footerText}
                        disabled={!isEditable}
                        onChange={(e) => updateConfig({ footerText: e.target.value })}
                      />
                      <p className="text-xs text-slate-500">
                        Platzhalter: {"{{courseName}}"}, {"{{courseCertificateTitle}}"},
                        {" {{courseVersion}}"}, {"{{companyName}}"} u. a.
                      </p>
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Anzeige</SectionTitle>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <CheckboxField
                        label="Firmenlogo anzeigen"
                        checked={formConfig.visibility.companyLogo}
                        disabled={!isEditable}
                        onChange={(companyLogo) =>
                          updateConfig({ visibility: { companyLogo } })
                        }
                      />
                      <CheckboxField
                        label="Certiano-Logo anzeigen"
                        checked={formConfig.visibility.certianoLogo}
                        disabled={!isEditable}
                        onChange={(certianoLogo) =>
                          updateConfig({ visibility: { certianoLogo } })
                        }
                      />
                      <CheckboxField
                        label="BAV-Code anzeigen"
                        checked={formConfig.visibility.bavCode}
                        disabled={!isEditable}
                        onChange={(bavCode) => updateConfig({ visibility: { bavCode } })}
                      />
                      <CheckboxField
                        label="Gültigkeit anzeigen"
                        checked={formConfig.visibility.validUntil}
                        disabled={!isEditable}
                        onChange={(validUntil) =>
                          updateConfig({ visibility: { validUntil } })
                        }
                      />
                      <CheckboxField
                        label="Prüfungsergebnis anzeigen"
                        checked={formConfig.visibility.examScore}
                        disabled={!isEditable}
                        onChange={(examScore) =>
                          updateConfig({ visibility: { examScore } })
                        }
                      />
                      <CheckboxField
                        label="Signaturbereich anzeigen"
                        checked={formConfig.visibility.signatureBlock}
                        disabled={!isEditable}
                        onChange={(signatureBlock) =>
                          updateConfig({ visibility: { signatureBlock } })
                        }
                      />
                      <CheckboxField
                        label="QR-Code anzeigen"
                        checked={formConfig.visibility.qrCode}
                        disabled={!isEditable}
                        onChange={(qrCode) => updateConfig({ visibility: { qrCode } })}
                      />
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Signatur</SectionTitle>
                    <p className="mb-4 text-sm text-slate-600">
                      Die konkrete Person und Position legt jede Firma unter{" "}
                      <strong>Meine Firma</strong> fest. Hier steuern Sie nur
                      Layout und Beschriftungen.
                    </p>
                    <div className="space-y-4">
                      <Input
                        label="Beschriftung verantwortliche Person"
                        value={formConfig.signature.personLabel}
                        disabled={!isEditable}
                        placeholder={DEFAULT_SIGNATURE_PERSON_LABEL}
                        onChange={(e) =>
                          updateConfig({
                            signature: { personLabel: e.target.value },
                          })
                        }
                      />
                      <Input
                        label="Beschriftung Position / Funktion"
                        value={formConfig.signature.positionLabel}
                        disabled={!isEditable}
                        placeholder={DEFAULT_SIGNATURE_POSITION_LABEL}
                        onChange={(e) =>
                          updateConfig({
                            signature: { positionLabel: e.target.value },
                          })
                        }
                      />
                    </div>
                  </section>

                  <section>
                    <SectionTitle>Gestaltung</SectionTitle>
                    <Input
                      label="Primärfarbe"
                      type="color"
                      value={formConfig.styling.primaryColor}
                      disabled={!isEditable}
                      className="h-12 cursor-pointer p-1"
                      onChange={(e) =>
                        updateConfig({ styling: { primaryColor: e.target.value } })
                      }
                    />
                  </section>
                </>
              )}
            </Card>

            <Card className="flex flex-col">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Vorschau</h2>
                  <p className="text-xs text-slate-500">
                    Synthetische Testdaten – keine echten Mitarbeiterdaten.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={previewLoading || detailLoading}
                  onClick={() => void refreshPreview()}
                >
                  {previewLoading ? "Wird geladen…" : "Vorschau aktualisieren"}
                </Button>
              </div>

              {previewUrl ? (
                <div className="min-h-[480px] flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                  <iframe
                    title="PDF-Vorschau"
                    src={previewUrl}
                    className="h-[min(70vh,640px)] w-full"
                  />
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
                  Klicken Sie auf „Vorschau aktualisieren“, um eine PDF-Vorschau zu
                  erzeugen.
                </div>
              )}

              {previewUrl ? (
                <a
                  href={previewUrl}
                  download={`preview-${documentType}.pdf`}
                  className="link-brand mt-3 inline-block text-sm font-medium"
                >
                  Vorschau herunterladen
                </a>
              ) : null}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

export function DocumentTemplateDesigner() {
  const [mainTab, setMainTab] = useState<MainTab>("templates");

  return (
    <>
      <PageHeader
        title="Zertifikate & Nachweise"
        description="Globale Vorlagen und automatische Seminarzuordnung. Keine personenbezogenen Zertifikatsdaten."
      />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        {(
          [
            { id: "templates" as const, label: "Vorlagen" },
            { id: "seminars" as const, label: "Seminare & Unterweisungen" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMainTab(tab.id)}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              mainTab === tab.id
                ? "border border-b-white border-slate-200 bg-white text-brand"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "templates" ? (
        <DocumentTemplateEditor />
      ) : (
        <DocumentTemplateSeminarsOverview />
      )}
    </>
  );
}

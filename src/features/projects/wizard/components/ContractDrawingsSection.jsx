import { useTranslation } from "react-i18next";
import { FormGrid } from "../../../../components/ui/form";
import StaticContractAttachmentFile from "./StaticContractAttachmentFile";

/**
 * ContractDrawingsSection - Contract drawings section
 * Displays all technical drawings upload fields
 */
export default function ContractDrawingsSection({
  form,
  setF,
  viewMode,
  projectId,
}) {
  const { t } = useTranslation();

  return (
    <div className="contract-drawings__wrapper">
      <h5 className="wizard-section__title contract-drawings__title">
        {`8) ${t("drawings_section_header")}`}
      </h5>
      <FormGrid cols={3} gap="md">
        <StaticContractAttachmentFile
          label={t("drawings_architectural_header")}
          value={form.architectural_drawings_file}
          fileUrl={form.architectural_drawings_file_url}
          fileName={form.architectural_drawings_file_name}
          onChange={(file) => setF("architectural_drawings_file", file)}
          onRemoveExisting={() => {
            setF("architectural_drawings_file_url", null);
            setF("architectural_drawings_file_name", null);
            setF("architectural_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_structural_header")}
          value={form.structural_drawings_file}
          fileUrl={form.structural_drawings_file_url}
          fileName={form.structural_drawings_file_name}
          onChange={(file) => setF("structural_drawings_file", file)}
          onRemoveExisting={() => {
            setF("structural_drawings_file_url", null);
            setF("structural_drawings_file_name", null);
            setF("structural_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_ac_header")}
          value={form.ac_drawings_file}
          fileUrl={form.ac_drawings_file_url}
          fileName={form.ac_drawings_file_name}
          onChange={(file) => setF("ac_drawings_file", file)}
          onRemoveExisting={() => {
            setF("ac_drawings_file_url", null);
            setF("ac_drawings_file_name", null);
            setF("ac_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_electrical_header")}
          value={form.electrical_drawings_file}
          fileUrl={form.electrical_drawings_file_url}
          fileName={form.electrical_drawings_file_name}
          onChange={(file) => setF("electrical_drawings_file", file)}
          onRemoveExisting={() => {
            setF("electrical_drawings_file_url", null);
            setF("electrical_drawings_file_name", null);
            setF("electrical_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_water_supply_header")}
          value={form.water_supply_drawings_file}
          fileUrl={form.water_supply_drawings_file_url}
          fileName={form.water_supply_drawings_file_name}
          onChange={(file) => setF("water_supply_drawings_file", file)}
          onRemoveExisting={() => {
            setF("water_supply_drawings_file_url", null);
            setF("water_supply_drawings_file_name", null);
            setF("water_supply_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_drainage_header")}
          value={form.drainage_drawings_file}
          fileUrl={form.drainage_drawings_file_url}
          fileName={form.drainage_drawings_file_name}
          onChange={(file) => setF("drainage_drawings_file", file)}
          onRemoveExisting={() => {
            setF("drainage_drawings_file_url", null);
            setF("drainage_drawings_file_name", null);
            setF("drainage_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_telecommunication_header")}
          value={form.telecommunication_drawings_file}
          fileUrl={form.telecommunication_drawings_file_url}
          fileName={form.telecommunication_drawings_file_name}
          onChange={(file) => setF("telecommunication_drawings_file", file)}
          onRemoveExisting={() => {
            setF("telecommunication_drawings_file_url", null);
            setF("telecommunication_drawings_file_name", null);
            setF("telecommunication_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_fire_fighting_header")}
          value={form.fire_fighting_drawings_file}
          fileUrl={form.fire_fighting_drawings_file_url}
          fileName={form.fire_fighting_drawings_file_name}
          onChange={(file) => setF("fire_fighting_drawings_file", file)}
          onRemoveExisting={() => {
            setF("fire_fighting_drawings_file_url", null);
            setF("fire_fighting_drawings_file_name", null);
            setF("fire_fighting_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />

        <StaticContractAttachmentFile
          label={t("drawings_cctv_header")}
          value={form.cctv_drawings_file}
          fileUrl={form.cctv_drawings_file_url}
          fileName={form.cctv_drawings_file_name}
          onChange={(file) => setF("cctv_drawings_file", file)}
          onRemoveExisting={() => {
            setF("cctv_drawings_file_url", null);
            setF("cctv_drawings_file_name", null);
            setF("cctv_drawings_file", null);
          }}
          accept=".pdf,.dwg,.dxf"
          maxSizeMB={30}
          isView={viewMode}
          projectId={projectId}
          endpoint={`projects/${projectId}/contract/`}
        />
      </FormGrid>
    </div>
  );
}

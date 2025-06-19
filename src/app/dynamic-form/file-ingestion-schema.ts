export const FILE_INGESTION_SCHEMA = {
  framework: "FileIngestion",
  description: "Structured CSV ingestion config",
  fields: [
    {
      key: "appName",
      label: "App Name",
      type: "text",
      defaultValue: "IngestionJob",
      mandatory: true,
      editable: true,
      regex: null,
      options: null,
      mandatoryIf: null,
      visibleIf: null,
      allowUserAddition: false,
      tooltip: "Unique job name",
      description: "Used in archival path creation"
    },
    {
      key: "target",
      label: "Target System",
      type: "dropdown",
      defaultValue: "hive",
      mandatory: true,
      editable: true,
      regex: null,
      options: ["hive", "snowflake", "oracle"],
      mandatoryIf: null,
      visibleIf: null,
      allowUserAddition: false,
      tooltip: "Select output system",
      description: "Used to route job"
    },
    {
      key: "tgtSnowflakeDb",
      label: "Snowflake DB",
      type: "text",
      defaultValue: "",
      mandatory: false,
      editable: true,
      regex: null,
      options: null,
      mandatoryIf: { key: "target", value: "snowflake" },
      visibleIf: { key: "target", value: "snowflake" },
      allowUserAddition: false,
      tooltip: null,
      description: "Only for Snowflake jobs"
    },
    {
      key: "enableIdempotent",
      label: "Enable Idempotent?",
      type: "boolean",
      defaultValue: false,
      mandatory: false,
      editable: true,
      regex: null,
      options: null,
      mandatoryIf: null,
      visibleIf: null,
      allowUserAddition: false,
      tooltip: "Ensure unique partition handling",
      description: null
    },
    {
      key: "idempotentOptions",
      label: "Idempotent Options",
      type: "json",
      defaultValue: {
        idempotentColName: "eap_custom_partition",
        failOnStale: true
      },
      mandatory: true,
      editable: true,
      regex: null,
      options: null,
      mandatoryIf: { key: "enableIdempotent", value: true },
      visibleIf: { key: "enableIdempotent", value: true },
      allowUserAddition: true,
      tooltip: "Shown if Idempotent is enabled",
      description: "Controls job deduplication"
    }
  ],
  mapSections: [
    {
      key: "columnMapping",
      label: "Column Mapping",
      type: "map",
      mandatory: true,
      defaultValue: {
        id: "emp_id",
        name: "emp_name"
      },
      allowUserAddition: true,
      tooltip: "Map input columns to DB columns",
      description: null
    },
    {
      key: "extraProperties",
      label: "Extra Properties",
      type: "map",
      mandatory: false,
      defaultValue: {},
      allowUserAddition: true,
      tooltip: "Add any extra config not predefined",
      description: null
    }
  ]
};

export const FORM_SCHEMA = FILE_INGESTION_SCHEMA;

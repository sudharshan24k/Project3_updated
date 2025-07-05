// Utility to parse .conf file content into a JS object matching the internal data structure
// Handles primitives, keyvalue (JSON), environment-specific, arrays, etc.

export function parseConfFile(confContent: string): any {
  const result: any = {};
  const lines = confContent.split(/\r?\n/);
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue; // skip empty/comments
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();
    // Remove surrounding quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    // Try to parse JSON objects (for keyvalue/map fields)
    if (value.startsWith('{') && value.endsWith('}')) {
      // Try JSON.parse first
      try {
        result[key] = JSON.parse(value);
        continue;
      } catch (e) {
        // If not valid JSON, try to parse as MCQ multiple: {"a","b","d"}
        const mcqArrayMatch = value.match(/^\{\s*("[^"]*"\s*(,\s*"[^"]*")*)\s*\}$/);
        if (mcqArrayMatch) {
          // Remove braces and split by comma, then remove quotes
          const arr = value.slice(1, -1).split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          result[key] = arr;
          continue;
        }
        // fallback to string
      }
    }
    // Empty object
    if (value === '{}') {
      result[key] = {};
      continue;
    }
    // Empty string
    if (value === '') {
      result[key] = '';
      continue;
    }
    // Otherwise, treat as string/primitive
    result[key] = value;
  }
  return result;
}

// Map parsed conf data to prefill structure using schema
export function mapConfToPrefill(parsedData: any, schema: any): any {
  const prefill: any = {};
  if (!schema || !Array.isArray(schema.fields)) return parsedData;
  for (const field of schema.fields) {
    const key = field.key;
    const type = field.type;
    const value = parsedData[key];
    if (field.environmentSpecific) {
      prefill[key] = { PROD: '', DEV: '', COB: '' };
      const defaultKeys = Array.isArray(field.default) ? field.default : [];
      ['PROD', 'DEV', 'COB'].forEach(env => {
        if (type === 'keyvalue') {
          let envValue = (value && typeof value === 'object' && value[env] !== undefined) ? value[env] : undefined;
          // If config is not environment-split, use the same value for all envs
          if (!envValue && value && typeof value === 'object' && Object.keys(value).length) {
            envValue = value;
          } else if (!envValue && value !== undefined && typeof value !== 'object') {
            envValue = value;
          }
          let keyValueArr: any[] = [];
          if (envValue && typeof envValue === 'object' && !Array.isArray(envValue)) {
            keyValueArr = Object.entries(envValue).map(([k, v]) => ({ key: k, value: v }));
          } else if (Array.isArray(envValue)) {
            keyValueArr = envValue;
          }
          // If no config data, just use default keys
          if ((!envValue || keyValueArr.length === 0) && defaultKeys.length > 0) {
            prefill[key][env] = defaultKeys.map((k: string) => ({ key: k, value: '' }));
          } else {
            // Ensure all default keys are present
            const mergedArr = defaultKeys.map((k: string) => {
              const found = keyValueArr.find((kv: any) => kv.key === k);
              return found ? found : { key: k, value: '' };
            });
            // Add any extra keys from config not in default
            keyValueArr.forEach((kv: any) => {
              if (!mergedArr.find((m: any) => m.key === kv.key)) mergedArr.push(kv);
            });
            prefill[key][env] = mergedArr;
          }
        } else if (type === 'mcq_multiple') {
          if (value && typeof value === 'object' && value[env] !== undefined) {
            prefill[key][env] = Array.isArray(value[env]) ? [...value[env]] : (typeof value[env] === 'string' ? value[env].split(',').map((v: string) => v.trim()) : []);
          } else if (value && typeof value === 'object' && Object.keys(value).length && env === 'PROD') {
            prefill[key][env] = Array.isArray(value) ? [...value] : (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : []);
          } else if (value !== undefined && typeof value !== 'object') {
            prefill[key][env] = typeof value === 'string' ? value.split(',').map((v: string) => v.trim()) : [];
          } else {
            prefill[key][env] = [];
          }
        } else {
          if (value && typeof value === 'object' && value[env] !== undefined) {
            prefill[key][env] = value[env];
          } else if (value && typeof value === 'object' && Object.keys(value).length && env === 'PROD') {
            prefill[key][env] = value;
          } else if (value !== undefined && typeof value !== 'object') {
            prefill[key][env] = value;
          } else {
            prefill[key][env] = '';
          }
        }
      });
      // If type is keyvalue and value is undefined or empty, always set default keys for all envs
      if (type === 'keyvalue' && (value === undefined || value === null || value === '')) {
        ['PROD', 'DEV', 'COB'].forEach(env => {
          prefill[key][env] = defaultKeys.map((k: string) => ({ key: k, value: '' }));
        });
      }
      // After filling from config, ensure all envs have at least default keys for keyvalue type
      if (type === 'keyvalue' && defaultKeys.length > 0) {
        ['PROD', 'DEV', 'COB'].forEach(env => {
          // If not an array of key-value objects, or is empty, set to default keys
          if (!Array.isArray(prefill[key][env]) || prefill[key][env].length === 0) {
            prefill[key][env] = defaultKeys.map((k: string) => ({ key: k, value: '' }));
          }
        });
      }
    } else if (type === 'keyvalue' && value && typeof value === 'object' && !Array.isArray(value)) {
      // Convert {k:v,...} to [{key:k,value:v},...], ensure default keys
      const defaultKeys = Array.isArray(field.default) ? field.default : [];
      let keyValueArr = Object.entries(value).map(([k, v]) => ({ key: k, value: v }));
      // Ensure all default keys are present
      const mergedArr = defaultKeys.map((k: string) => {
        const found = keyValueArr.find((kv: any) => kv.key === k);
        return found ? found : { key: k, value: '' };
      });
      // Add any extra keys from config not in default
      keyValueArr.forEach((kv: any) => {
        if (!mergedArr.find((m: any) => m.key === kv.key)) mergedArr.push(kv);
      });
      prefill[key] = mergedArr;
    } else if (type === 'mcq_multiple' && Array.isArray(value)) {
      prefill[key] = [...value];
    } else if (value !== undefined) {
      prefill[key] = value;
    } else {
      if (type === 'keyvalue') prefill[key] = Array.isArray(field.default) ? field.default.map((k: string) => ({ key: k, value: '' })) : [];
      else if (type === 'mcq_multiple') prefill[key] = [];
      else prefill[key] = '';
    }
  }
  return prefill;
}

// Validate parsed config data against the template schema
export function validateConfAgainstSchema(parsedData: any, schema: any): { valid: boolean, errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!schema || !Array.isArray(schema.fields)) {
    return { valid: false, errors: ['Invalid schema.'], warnings };
  }
  const dataKeys = Object.keys(parsedData || {});
  for (const field of schema.fields) {
    const key = field.key;
    const type = field.type;
    const value = parsedData[key];
    // Required check
    if (field.mandatory && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${field.label || key}`);
      continue;
    }
    // Type check
    if (value !== undefined && value !== null && value !== '') {
      if (type === 'number' && isNaN(Number(value))) {
        errors.push(`Field '${field.label || key}' should be a number.`);
      }
      if (type === 'boolean' && !(value === true || value === false || value === 'true' || value === 'false')) {
        errors.push(`Field '${field.label || key}' should be a boolean.`);
      }
      if (type === 'dropdown' && field.options && !field.options.includes(value)) {
        errors.push(`Field '${field.label || key}' has invalid value '${value}'. Allowed: ${field.options.join(', ')}`);
      }
      if (type === 'keyvalue' && value && typeof value === 'object' && !Array.isArray(value)) {
        // Accepts object, but warn if empty
        if (Object.keys(value).length === 0 && field.mandatory) {
          errors.push(`Field '${field.label || key}' is required and cannot be empty.`);
        }
      }
      if (type === 'mcq_multiple' && Array.isArray(value) && field.options) {
        const invalid = value.filter((v: any) => !field.options.includes(v));
        if (invalid.length > 0) {
          errors.push(`Field '${field.label || key}' has invalid options: ${invalid.join(', ')}`);
        }
      }
      // Regex check
      if (field.regex && typeof value === 'string') {
        try {
          const re = new RegExp(field.regex);
          if (!re.test(value)) {
            errors.push(`Field '${field.label || key}' does not match required format.`);
          }
        } catch {}
      }
    }
  }
  // Warn about extra fields
  for (const key of dataKeys) {
    if (!schema.fields.some((f: any) => f.key === key)) {
      warnings.push(`Extra field in config: ${key}`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

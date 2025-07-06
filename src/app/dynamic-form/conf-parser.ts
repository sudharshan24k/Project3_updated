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

// Utility: which field types require quoting?
function fieldTypeRequiresQuoting(type: string): boolean {
  // Enforce quoting for all types that should be quoted, including boolean, number, and mcq_single
  return (
    type === 'string' ||
    type === 'dropdown' ||
    type === 'email' ||
    type === 'text' ||
    type === 'boolean' ||
    type === 'number' ||
    type === 'mcq_single'
  );
}

// Strict parser for config validation: keep all values as raw strings for validation
export function strictParseConfFile(confContent: string, schema: any): { parsed: any, syntaxErrors: string[] } {
  const result: any = {};
  const syntaxErrors: string[] = [];
  const lines = confContent.split(/\r?\n/);
  const fieldTypes: Record<string, string> = {};
  if (schema && Array.isArray(schema.fields)) {
    for (const field of schema.fields) {
      fieldTypes[field.key] = field.type;
    }
  }
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) {
      syntaxErrors.push(`Line ${i+1}: Missing '=' in line.`);
      continue;
    }
    const key = line.substring(0, eqIdx).trim();
    let value = line.substring(eqIdx + 1).trim();
    const type = fieldTypes[key];
    if (!type) {
      syntaxErrors.push(`Line ${i+1}: Unknown key '${key}'.`);
      continue;
    }
    // For strict validation, keep all values as raw strings (do not parse JSON/arrays)
    result[key] = value;
  }
  return { parsed: result, syntaxErrors };
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
// Helper function to check if a value is empty (handles all quote variations)
function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null || value === '') {
    return true;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    // Handle empty string
    if (trimmed === '') return true;
    // Handle various quote patterns that represent empty values
    // This covers: "", \", \", \\\"\\\" etc.
    const unescapedValue = trimmed.replace(/\\"/g, '"').replace(/\\'/g, "'");
    // Treat 'null', '"null"', "'null'" as empty
    if (
      unescapedValue === 'null' ||
      unescapedValue === '"null"' ||
      unescapedValue === "'null'" ||
      unescapedValue === '""' ||
      unescapedValue === "''" ||
      unescapedValue === ''
    ) {
      return true;
    }
    // Also check if it's just quotes with nothing inside
    if (/^["']*$/ .test(unescapedValue) && unescapedValue.length <= 4) {
      return true;
    }
    return false;
  }
  return false;
}

// Helper to get label from key
function getLabelForKey(schema: any, key: string): string {
  if (!schema || !Array.isArray(schema.fields)) return key;
  const field = schema.fields.find((f: any) => f.key === key);
  return field ? (field.label || key) : key;
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
    
    // Check if field is entirely missing from config (regardless of mandatory status)
    if (!(key in parsedData)) {
      errors.push(`Missing field: ${field.label || key}`);
      continue; // Skip further validation for missing fields
    }
    
    // Evaluate visibleIf and mandatoryIf
    let visible = true;
    let isMandatory = !!field.mandatory;
    
    if (field.visibleIf) {
      try {
        visible = evalVisibleIf(field.visibleIf, parsedData);
      } catch {}
    }
    
    if (field.mandatoryIf) {
      try {
        isMandatory = evalVisibleIf(field.mandatoryIf, parsedData);
      } catch {}
    }
    
    if (!visible) continue;
    
    // Required check - if field is mandatory and has empty value
    if (isMandatory && isEmptyValue(value)) {
      errors.push(`Missing required field: ${field.label || key}`);
      continue; // Skip type validation for empty mandatory fields
    }
    
    // User editable check
    if (field.userEditable === false && value !== undefined) {
      warnings.push(`Field '${field.label || key}' is not user editable but present in config.`);
    }
    
    // Only enforce quoting for types that require it
    if (!isEmptyValue(value) && fieldTypeRequiresQuoting(type)) {
      if (!(typeof value === 'string' && value.startsWith('"') && value.endsWith('"'))) {
        errors.push(`Field '${field.label || key}' must be quoted (e.g. "value").`);
        continue;
      }
    }
    
    // Type check - only validate if value is not empty
    if (!isEmptyValue(value)) {
      let unquotedValue = value;
      if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        unquotedValue = value.slice(1, -1);
      }
      
      if (type === 'number' && isNaN(Number(unquotedValue))) {
        errors.push(`Field '${field.label || key}' should be a number.`);
      }
      
      if (type === 'boolean' && !(unquotedValue === 'true' || unquotedValue === 'false')) {
        errors.push(`Field '${field.label || key}' should be a boolean ('true' or 'false').`);
      }
      
      // For dropdown and mcq_single, support options as array of objects or strings
      let allowedOptions: string[] = [];
      if (Array.isArray(field.options)) {
        if (typeof field.options[0] === 'object' && field.options[0] !== null) {
          allowedOptions = field.options.map((opt: any) => opt.label || opt.value || String(opt));
        } else {
          allowedOptions = field.options;
        }
      }
      if (type === 'dropdown' && allowedOptions.length && !allowedOptions.includes(unquotedValue)) {
        errors.push(`Field '${field.label || key}' has invalid value '${unquotedValue}'. Allowed: ${allowedOptions.join(', ')}`);
      }
      if (type === 'mcq_single' && allowedOptions.length && !allowedOptions.includes(unquotedValue)) {
        errors.push(`Field '${field.label || key}' has invalid value '${unquotedValue}'. Allowed: ${allowedOptions.join(', ')}`);
      }
      
      if (type === 'keyvalue' && value && typeof value === 'object' && !Array.isArray(value)) {
        // Accepts object, but error if empty and mandatory
        if (Object.keys(value).length === 0 && isMandatory) {
          errors.push(`Field '${field.label || key}' is required and cannot be empty.`);
        }
      }
      
      if (type === 'mcq_multiple' && value) {
        // Only accept {"a","b"} format (raw string)
        if (!/^\{\s*("[^"]*"\s*(,\s*"[^"]*"))*\s*\}$/.test(value)) {
          errors.push(`Field '${field.label || key}' must be in {"a","b"} format.`);
        }
      }
      
      // Regex check
      if (field.regex && typeof unquotedValue === 'string') {
        try {
          const re = new RegExp(field.regex);
          if (!re.test(unquotedValue)) {
            errors.push(`Field '${field.label || key}' does not match required format.`);
          }
        } catch {}
      }
    }
  }
  
  // Warn about extra fields
  for (const key of dataKeys) {
    if (!schema.fields.some((f: any) => f.key === key)) {
      warnings.push(`Extra field in config: ${getLabelForKey(schema, key)}`);
    }
  }
  
  return { valid: errors.length === 0, errors, warnings };
}

// Returns per-field validation status for config validator UI
export function getConfigValidationFieldResults(parsedData: any, schema: any, extraFields?: string[]): any[] {
  if (!schema || !Array.isArray(schema.fields)) return [];
  const results: any[] = [];
  const dataKeys = Object.keys(parsedData || {});
  const schemaKeys = schema.fields.map((f: any) => f.key);
  // Track missing fields for per-field cross
  for (const field of schema.fields) {
    const key = field.key;
    const label = field.label || key;
    const type = field.type;
    const value = parsedData[key];
    // Evaluate visibleIf and mandatoryIf
    let visible = true;
    let mandatory = !!field.mandatory;
    if (field.visibleIf) {
      try {
        visible = evalVisibleIf(field.visibleIf, parsedData);
      } catch {}
    }
    if (field.mandatoryIf) {
      try {
        mandatory = evalVisibleIf(field.mandatoryIf, parsedData);
      } catch {}
    }
    if (!visible) {
      results.push({ key, label, status: 'hidden', message: 'Field not visible.' });
      continue;
    }
    // Required check: Use helper function for comprehensive empty checking
    const isEmpty = isEmptyValue(value);
    if (isEmpty) {
      // Mark any empty value as invalid, regardless of mandatory
      results.push({ key, label, status: 'invalid', message: 'This field cannot be empty.', error: true });
      continue;
    }
    // User editable check
    if (field.userEditable === false && value !== undefined) {
      results.push({ key, label, status: 'invalid', message: 'Field is not user editable but present in config.', error: true });
      continue;
    }
    // Only enforce quoting for types that require it - and only for non-empty values
    if (!isEmpty && fieldTypeRequiresQuoting(type)) {
      if (!(typeof value === 'string' && value.startsWith('"') && value.endsWith('"'))) {
        results.push({ key, label, status: 'invalid', message: 'Value must be quoted (e.g. "value").', error: true });
        continue;
      }
    }
    // Type check - only validate non-empty values
    if (!isEmpty) {
      let unquotedValue = value;
      if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
        unquotedValue = value.slice(1, -1);
      }
        // Support options as array of strings or array of objects with 'value' property
      let allowedOptions: string[] = [];
      if (Array.isArray(field.options)) {
        if (typeof field.options[0] === 'object' && field.options[0] !== null) {
          allowedOptions = field.options.map((opt: any) => opt.label || opt.value || String(opt));
        } else {
          allowedOptions = field.options;
        }
      }
      if (type === 'dropdown' && allowedOptions.length && !allowedOptions.includes(unquotedValue)) {
        results.push({ key, label, status: 'invalid', message: `Invalid value. Allowed: ${allowedOptions.join(', ')}`, error: true });
        continue;
      }
      if (type === 'mcq_single' && allowedOptions.length && !allowedOptions.includes(unquotedValue)) {
        results.push({ key, label, status: 'invalid', message: `Invalid value. Allowed: ${allowedOptions.join(', ')}`, error: true });
        continue;
      }
      if (type === 'keyvalue' && value && typeof value === 'object' && !Array.isArray(value)) {
        if (Object.keys(value).length === 0 && mandatory) {
          results.push({ key, label, status: 'invalid', message: 'Required and cannot be empty.', error: true });
          continue;
        }
      }
      if (type === 'mcq_multiple' && value) {
        // Only accept {"a","b"} format (raw string)
        if (!/^\{\s*("[^"]*"\s*(,\s*"[^"]*"))*\s*\}$/.test(value)) {
          results.push({ key, label, status: 'invalid', message: 'Value must be in {"a","b"} format.', error: true });
          continue;
        }
      }
      if (field.regex && typeof unquotedValue === 'string') {
        try {
          const re = new RegExp(field.regex);
          if (!re.test(unquotedValue)) {
            results.push({ key, label, status: 'invalid', message: 'Does not match required format.', error: true });
            continue;
          }
        } catch {}
      }
    }
    // Only push a tick (valid) if there were no errors for this field
    // Criteria for tick: visible, not missing, not invalid, not empty, passes all checks above
    results.push({ key, label, status: 'valid', message: 'Valid.' });
  }
  // Add extra fields that exist in config but not in schema
  const extraFieldsInConfig = dataKeys.filter(key => !schemaKeys.includes(key));
  // Add extra fields from parameter (if provided) and from config comparison
  const allExtraFields = [...new Set([...(extraFields || []), ...extraFieldsInConfig])];
  if (allExtraFields.length > 0) {
    allExtraFields.forEach(fieldKey => {
      results.push({ 
        key: fieldKey, 
        label: getLabelForKey(schema, fieldKey), 
        status: 'extra', 
        message: 'This field is extra in config file and not present in the template schema.', error: true 
      });
    });
  }
  return results;
}

// Simple JS expression evaluator for visibleIf/mandatoryIf
function evalVisibleIf(expr: string, data: any): boolean {
  try {
    const keys = Object.keys(data);
    const args = keys.map(k => data[k]);
    // eslint-disable-next-line no-new-func
    return Function(...keys, `return (${expr});`)(...args);
  } catch {
    return false;
  }
}
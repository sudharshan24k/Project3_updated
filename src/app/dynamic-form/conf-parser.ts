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

    // Remove surrounding quotes if present (both single and double)
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
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

// Updated helper functions for both quote types
function isProperlyQuoted(value: string): boolean {
  if (typeof value !== 'string') return false;
  
  // Check for proper double quotes
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    return true;
  }
  
  // Check for proper single quotes
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return true;
  }
  
  return false;
}

function normalizeQuotedValue(value: string): string {
  if (typeof value === 'string') {
    // Handle both single and double quotes
    if ((value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
        (value.startsWith("'") && value.endsWith("'") && value.length >= 2)) {
      return value.slice(1, -1);
    }
  }
  return value;
}

// Add strict number validation
function isValidNumber(value: string): boolean {
  if (typeof value !== 'string') return false;
  
  // Remove quotes first
  const unquotedValue = normalizeQuotedValue(value);
  
  // Check if the unquoted value has leading/trailing spaces
  if (unquotedValue !== unquotedValue.trim()) {
    return false; // Invalid if has leading/trailing spaces
  }
  
  // Check if it's a valid number (integer or decimal)
  const numberRegex = /^-?\d+(\.\d+)?$/;
  return numberRegex.test(unquotedValue);
}

// Enhanced function to validate keyvalue format
function isValidKeyValueFormat(value: string): boolean {
  // Allow empty object
  if (value === '{}') return true;
  // Reject square bracket formats immediately
  if (value.startsWith('[') && value.endsWith(']')) return false;
  // Must start with { and end with }
  if (!value.startsWith('{') || !value.endsWith('}')) return false;
  // Check for proper JSON format: {"key1":"value1","key2":"value2"}
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      // Ensure all keys and values are strings
      return Object.entries(parsed).every(([k, v]) =>
        typeof k === 'string' && typeof v === 'string'
      );
    }
  } catch {}
  return false;
}

// Enhanced function to detect invalid lines, unexpected characters, and duplicate fields
function validateLineFormat(line: string, lineNumber: number, fieldTypes: Record<string, string>, seenFields: Set<string>): string[] {
  const errors: string[] = [];
  
  // Remove comments first
  const commentIndex = line.indexOf('#');
  const lineWithoutComment = commentIndex !== -1 ? line.substring(0, commentIndex) : line;
  const trimmed = lineWithoutComment.trim();
  
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith('#')) return errors;

  // Check for lines without '=' (invalid field definitions)
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) {
    if (trimmed.match(/^[^=]*$/)) {
      errors.push(`Line ${lineNumber}: Invalid line format. Expected 'key=value' but found: '${trimmed}'`);
    }
    return errors;
  }

  const key = trimmed.substring(0, eqIdx).trim();
  const value = trimmed.substring(eqIdx + 1).trim();

  // Validate key format
  if (!key.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
    errors.push(`Line ${lineNumber}: Invalid key format '${key}'. Keys should contain only letters, numbers, and underscores.`);
  }

  // Check for duplicate field definitions
  if (seenFields.has(key)) {
    errors.push(`Line ${lineNumber}: Duplicate field '${key}'. Field already defined earlier in the config.`);
  } else {
    seenFields.add(key);
  }

  // Check for unknown keys
  if (!fieldTypes[key]) {
    errors.push(`Line ${lineNumber}: Unknown key '${key}'.`);
  }

  // Check for incomplete JSON objects
  if (value.startsWith('{') && !value.endsWith('}')) {
    errors.push(`Line ${lineNumber}: Incomplete JSON object for key '${key}'. Missing closing brace.`);
  }

  // Check for incomplete MCQ arrays
  if (value.startsWith('{') && value.includes('"') && !value.endsWith('}')) {
    errors.push(`Line ${lineNumber}: Incomplete MCQ array for key '${key}'. Missing closing brace.`);
  }

  // Check for trailing characters after the value
  const fullLine = line;
  const valueEndIndex = fullLine.indexOf(value) + value.length;
  const afterValue = fullLine.substring(valueEndIndex).trim();
  if (afterValue && !afterValue.startsWith('#')) {
    errors.push(`Line ${lineNumber}: Unexpected characters after value: '${afterValue}'`);
  }

  // Validate keyvalue format specifically
  const fieldType = fieldTypes[key];
  if (fieldType === 'keyvalue' && value && !isValidKeyValueFormat(value)) {
    if (value.startsWith('[') && value.endsWith(']')) {
      errors.push(`Line ${lineNumber}: Invalid keyvalue format for '${key}'. Use {"key1":"value1"} instead of square brackets.`);
    } else {
      errors.push(`Line ${lineNumber}: Invalid keyvalue format for '${key}'. Must be {"key1":"value1","key2":"value2"} or {}.`);
    }
  }

  return errors;
}

// Strict parser for config validation: keep all values as raw strings for validation
export function strictParseConfFile(confContent: string, schema: any): { parsed: any, syntaxErrors: string[] } {
  const result: any = {};
  const syntaxErrors: string[] = [];
  const lines = confContent.split(/\r?\n/);
  const fieldTypes: Record<string, string> = {};
  const seenFields = new Set<string>();

  if (schema && Array.isArray(schema.fields)) {
    for (const field of schema.fields) {
      fieldTypes[field.key] = field.type;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    // Remove comments first (everything after #)
    const commentIndex = line.indexOf('#');
    const lineWithoutComment = commentIndex !== -1 ? line.substring(0, commentIndex) : line;
    
    // Validate each line format and collect errors
    const lineErrors = validateLineFormat(lineWithoutComment, lineNumber, fieldTypes, seenFields);
    syntaxErrors.push(...lineErrors);

    const trimmed = lineWithoutComment.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;

    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();

    // Handle both single and double quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      // Keep the quotes for validation purposes
      // The validation logic will handle quote removal
    }

    // Only add valid key-value pairs to result
    if (fieldTypes[key] && key.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      if (!(key in result)) {
        result[key] = value;
      }
    }
  }

  return { parsed: result, syntaxErrors };
}

// Helper function to check if a value is empty (handles all quote variations)
function isEmptyValue(value: any): boolean {
  if (value === undefined || value === null || value === '') {
    return true;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return true;
    
    // Handle both single and double quoted empty values
    if (trimmed === '""' || trimmed === "''" || 
        trimmed === '"\'"' || trimmed === '\'"\'') return true;
    
    // Handle escaped quotes and null values
    const unescapedValue = trimmed.replace(/\\"/g, '"').replace(/\\'/g, "'");
    if (unescapedValue === 'null' || 
        unescapedValue === '"null"' || unescapedValue === "'null'" ||
        unescapedValue === '""' || unescapedValue === "''") {
      return true;
    }

    // Check if it's a quoted empty string (both single and double quotes)
    if ((trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length === 2) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length === 2)) {
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

// Helper to get field by key
function getFieldByKey(schema: any, key: string): any {
  if (!schema || !Array.isArray(schema.fields)) return null;
  return schema.fields.find((f: any) => f.key === key);
}

// Helper to get default value for a field
function getDefaultValue(field: any): any {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.default !== undefined) return field.default;
  return null;
}

// **UPDATED: Simple equality-based conditional logic evaluator**
function evalVisibleIf(condition: any, data: any): boolean {
  try {
    // Handle object-based conditions (recommended format)
    if (typeof condition === 'object' && condition !== null && condition.key) {
      const { key, value } = condition;
      if (!key) return true; // Default to visible if no key specified

      const fieldValue = data[key];

      // Handle quoted values in config data
      let actualFieldValue = fieldValue;
      if (typeof fieldValue === 'string' && ((fieldValue.startsWith('"') && fieldValue.endsWith('"')) || 
          (fieldValue.startsWith("'") && fieldValue.endsWith("'")))) {
        actualFieldValue = fieldValue.slice(1, -1);
      }

      // Handle quoted expected values
      let expectedValue = value;
      if (typeof value === 'string' && ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'")))) {
        expectedValue = value.slice(1, -1);
      }

      // Handle boolean values properly
      if (typeof expectedValue === 'string') {
        if (expectedValue.toLowerCase() === 'true') {
          expectedValue = true;
        } else if (expectedValue.toLowerCase() === 'false') {
          expectedValue = false;
        }
      }

      if (typeof actualFieldValue === 'string') {
        if (actualFieldValue.toLowerCase() === 'true') {
          actualFieldValue = true;
        } else if (actualFieldValue.toLowerCase() === 'false') {
          actualFieldValue = false;
        }
      }

      // Simple equality check
      const result = actualFieldValue == expectedValue;
      console.log(`Condition check: ${key} == ${expectedValue} (actual: ${actualFieldValue}) = ${result}`);
      return result;
    }

    // Handle string-based conditions (legacy format)
    if (typeof condition === 'string') {
      // Parse simple equality expressions like "q1 === '45'" or "q1 == \"45\""
      const equalityMatch = condition.match(/(\w+)\s*(===|==)\s*['"]?([^'"]+)['"]?/);
      if (equalityMatch) {
        const [, fieldKey, , expectedValue] = equalityMatch;
        const fieldValue = data[fieldKey];
        
        // Handle quoted values
        let actualFieldValue = fieldValue;
        if (typeof fieldValue === 'string' && ((fieldValue.startsWith('"') && fieldValue.endsWith('"')) || 
            (fieldValue.startsWith("'") && fieldValue.endsWith("'")))) {
          actualFieldValue = fieldValue.slice(1, -1);
        }

        const result = actualFieldValue == expectedValue;
        console.log(`String condition check: ${fieldKey} == ${expectedValue} (actual: ${actualFieldValue}) = ${result}`);
        return result;
      }

      // Fallback to JavaScript evaluation for complex expressions
      const keys = Object.keys(data);
      const args = keys.map(k => {
        let val = data[k];
        // Unquote values for JavaScript evaluation
        if (typeof val === 'string' && ((val.startsWith('"') && val.endsWith('"')) || 
            (val.startsWith("'") && val.endsWith("'")))) {
          val = val.slice(1, -1);
        }
        return val;
      });
      const result = Function(...keys, `return (${condition});`)(...args);
      console.log(`Complex condition check: ${condition} = ${result}`);
      return result;
    }

    // If no condition is specified, default to visible
    return true;
  } catch (error) {
    console.error('Error evaluating condition:', condition, error);
    // Default to visible if evaluation fails
    return true;
  }
}

// Updated validation function with single quote support and strict number validation
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

    // Check if field is entirely missing from config
    if (!(key in parsedData)) {
      errors.push(`Missing field: ${field.label || key}`);
      continue; // Skip further validation for missing fields
    }

    // Evaluate visibleIf and mandatoryIf with proper boolean normalization
    let visible = true;
    let isMandatory = !!(field.mandatory || field.required); // Handle both properties

    if (field.visibleIf) {
      try {
        visible = !!evalVisibleIf(field.visibleIf, parsedData);
      } catch {
        visible = true; // Default to visible if evaluation fails
      }
    }

    if (field.mandatoryIf) {
      try {
        isMandatory = !!evalVisibleIf(field.mandatoryIf, parsedData);
      } catch {
        isMandatory = !!(field.mandatory || field.required); // Fall back to field properties
      }
    }

    if (!visible) continue;

    // Check if value is empty
    const isEmpty = isEmptyValue(value);

    // Required check - ONLY show error if field is mandatory AND empty
    if (isMandatory && isEmpty) {
      errors.push(`Missing required field: ${field.label || key}`);
      continue; // Skip type validation for empty mandatory fields
    }

    // If field is empty but not mandatory, skip all other validations
    if (isEmpty && !isMandatory) {
      continue; // No error/warning for optional empty fields
    }

    // User editable check - if field is not editable, it must have the default value
    if (field.userEditable === false || field.editable === false) {
      const defaultValue = getDefaultValue(field);
      if (defaultValue !== null) {
        // Compare the actual value with default value (handle quoted strings)
        let actualValue = value;
        if (typeof value === 'string' && isProperlyQuoted(value)) {
          actualValue = normalizeQuotedValue(value);
        }

        let expectedValue = defaultValue;
        if (typeof defaultValue === 'string' && !isProperlyQuoted(defaultValue)) {
          expectedValue = `"${defaultValue}"`;
        }

        if (value !== expectedValue && actualValue !== defaultValue) {
          errors.push(`Field '${field.label || key}' is not user editable and must have default value: ${defaultValue}`);
          continue;
        }
      }
    }

    // Only enforce quoting for types that require it and only for non-empty values
    if (!isEmpty && fieldTypeRequiresQuoting(type)) {
      if (!isProperlyQuoted(value)) {
        errors.push(`Field '${field.label || key}' must be quoted with either double quotes ("value") or single quotes ('value').`);
        continue;
      }
    }

    // Type check - only validate if value is not empty
    if (!isEmpty) {
      let unquotedValue = normalizeQuotedValue(value);

      // Enhanced number validation with space detection
      if (type === 'number') {
        if (!isValidNumber(value)) {
          const rawUnquoted = normalizeQuotedValue(value);
          if (rawUnquoted !== rawUnquoted.trim()) {
            errors.push(`Field '${field.label || key}' contains leading or trailing spaces. Numbers should not have spaces: found '${rawUnquoted}'.`);
          } else {
            errors.push(`Field '${field.label || key}' must be a valid number without spaces or special characters.`);
          }
          continue;
        }
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

      // Enhanced keyvalue validation
      if (type === 'keyvalue') {
        if (typeof value === 'string') {
          if (!isValidKeyValueFormat(value)) {
            if (value.startsWith('[') && value.endsWith(']')) {
              errors.push(`Field '${field.label || key}' has invalid format. Use {"key1":"value1","key2":"value2"} instead of square brackets.`);
            } else {
              errors.push(`Field '${field.label || key}' must be in format {"key1":"value1","key2":"value2"} or {}.`);
            }
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Accepts object, but error if empty and mandatory
          if (Object.keys(value).length === 0 && isMandatory) {
            errors.push(`Field '${field.label || key}' is required and cannot be empty.`);
          }
        }
      }

      if (type === 'mcq_multiple' && value) {
        // Check format first
        if (!/^\{\s*("[^"]*"\s*(,\s*"[^"]*")*)\s*\}$/.test(value)) {
          errors.push(`Field '${field.label || key}' must be in {"a","b"} format.`);
        } else {
          // Extract the selected options and validate against allowed options
          const mcqArrayMatch = value.match(/^\{\s*("[^"]*"\s*(,\s*"[^"]*")*)\s*\}$/);
          if (mcqArrayMatch && field.options && Array.isArray(field.options)) {
            const selectedOptions = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
            
            // Get allowed options (handle both string arrays and object arrays)
            let allowedMcqOptions: string[] = [];
            if (typeof field.options[0] === 'object' && field.options[0] !== null) {
              allowedMcqOptions = field.options.map((opt: any) => opt.label || opt.value || String(opt));
            } else {
              allowedMcqOptions = field.options;
            }

            // Check if all selected options are valid
            const invalidOptions = selectedOptions.filter((opt: string) => !allowedMcqOptions.includes(opt));
            if (invalidOptions.length > 0) {
              errors.push(`Field '${field.label || key}' has invalid options: ${invalidOptions.join(', ')}. Allowed: ${allowedMcqOptions.join(', ')}`);
            }
          }
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

  for (const field of schema.fields) {
    const key = field.key;
    const label = field.label || key;
    const type = field.type;
    const value = parsedData[key];

    // Check if field is entirely missing from config
    if (!(key in parsedData)) {
      results.push({
        key,
        label,
        status: 'missing',
        message: `Missing field: ${label}`,
        error: true
      });
      continue;
    }

    // Evaluate visibleIf and mandatoryIf with proper boolean normalization
    let visible = true;
    let mandatory = !!(field.mandatory || field.required); // Handle both properties
    let visibilityReason = '';

    if (field.visibleIf) {
      try {
        visible = !!evalVisibleIf(field.visibleIf, parsedData);
        // Create a more descriptive message for hidden fields
        if (!visible) {
          if (typeof field.visibleIf === 'object' && field.visibleIf.key) {
            const controllingValue = parsedData[field.visibleIf.key];
            visibilityReason = `Hidden because ${field.visibleIf.key} is "${controllingValue}" but should be "${field.visibleIf.value}"`;
          } else {
            visibilityReason = `Hidden due to conditional logic: ${JSON.stringify(field.visibleIf)}`;
          }
        }
      } catch (error) {
        console.error(`Error evaluating visibleIf for field ${key}:`, error);
        visible = true; // Default to visible if evaluation fails
        visibilityReason = 'Error evaluating condition - defaulting to visible';
      }
    }

    if (field.mandatoryIf) {
      try {
        mandatory = !!evalVisibleIf(field.mandatoryIf, parsedData);
      } catch (error) {
        console.error(`Error evaluating mandatoryIf for field ${key}:`, error);
        mandatory = !!(field.mandatory || field.required);
      }
    }

    if (!visible) {
      results.push({
        key,
        label,
        status: 'hidden',
        message: visibilityReason || 'Field not visible due to conditional logic.'
      });
      continue;
    }

    // Check if value is empty
    const isEmpty = isEmptyValue(value);

    // Required check: ONLY show error if field is mandatory AND empty
    if (isEmpty && mandatory) {
      results.push({
        key,
        label,
        status: 'invalid',
        message: `Missing required field: ${label}`,
        error: true
      });
      continue;
    }

    // If field is empty but not mandatory, mark as valid (no error/warning)
    if (isEmpty && !mandatory) {
      results.push({
        key,
        label,
        status: 'valid',
        message: 'Optional field (empty).'
      });
      continue;
    }

    // User editable check - if field is not editable, it must have the default value
    if (field.userEditable === false || field.editable === false) {
      const defaultValue = getDefaultValue(field);
      if (defaultValue !== null) {
        // Compare the actual value with default value (handle quoted strings)
        let actualValue = value;
        if (typeof value === 'string' && isProperlyQuoted(value)) {
          actualValue = normalizeQuotedValue(value);
        }

        let expectedValue = defaultValue;
        if (typeof defaultValue === 'string' && !isProperlyQuoted(defaultValue)) {
          expectedValue = `"${defaultValue}"`;
        }

        if (value !== expectedValue && actualValue !== defaultValue) {
          results.push({
            key,
            label,
            status: 'invalid',
            message: `Field is not user editable and must have default value: ${defaultValue}`,
            error: true
          });
          continue;
        }
      }
    }

    // Only enforce quoting for types that require it - and only for non-empty values
    if (!isEmpty && fieldTypeRequiresQuoting(type)) {
      if (!isProperlyQuoted(value)) {
        results.push({
          key,
          label,
          status: 'invalid',
          message: 'Value must be quoted with either double quotes ("value") or single quotes (\'value\').',
          error: true
        });
        continue;
      }
    }

    // Type check - only validate non-empty values
    if (!isEmpty) {
      let unquotedValue = normalizeQuotedValue(value);

      // Enhanced number validation with space detection
      if (type === 'number') {
        if (!isValidNumber(value)) {
          const rawUnquoted = normalizeQuotedValue(value);
          if (rawUnquoted !== rawUnquoted.trim()) {
            results.push({
              key,
              label,
              status: 'invalid',
              message: `Contains leading or trailing spaces. Numbers should not have spaces: found '${rawUnquoted}'.`,
              error: true
            });
          } else {
            results.push({
              key,
              label,
              status: 'invalid',
              message: 'Must be a valid number without spaces or special characters.',
              error: true
            });
          }
          continue;
        }
      }

      if (type === 'boolean' && !(unquotedValue === 'true' || unquotedValue === 'false')) {
        results.push({
          key,
          label,
          status: 'invalid',
          message: 'Should be a boolean (true or false).',
          error: true
        });
        continue;
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
        results.push({
          key,
          label,
          status: 'invalid',
          message: `Invalid value. Allowed: ${allowedOptions.join(', ')}`,
          error: true
        });
        continue;
      }

      if (type === 'mcq_single' && allowedOptions.length && !allowedOptions.includes(unquotedValue)) {
        results.push({
          key,
          label,
          status: 'invalid',
          message: `Invalid value. Allowed: ${allowedOptions.join(', ')}`,
          error: true
        });
        continue;
      }

      // Enhanced keyvalue validation
      if (type === 'keyvalue') {
        if (typeof value === 'string') {
          if (!isValidKeyValueFormat(value)) {
            if (value.startsWith('[') && value.endsWith(']')) {
              results.push({
                key,
                label,
                status: 'invalid',
                message: 'Invalid format. Use {"key1":"value1"} instead of square brackets.',
                error: true
              });
            } else {
              results.push({
                key,
                label,
                status: 'invalid',
                message: 'Must be in format {"key1":"value1","key2":"value2"} or {}.',
                error: true
              });
            }
            continue;
          }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          if (Object.keys(value).length === 0 && mandatory) {
            results.push({
              key,
              label,
              status: 'invalid',
              message: 'Required and cannot be empty.',
              error: true
            });
            continue;
          }
        }
      }

      if (type === 'mcq_multiple' && value) {
        // Check format first
        if (!/^\{\s*("[^"]*"\s*(,\s*"[^"]*")*)\s*\}$/.test(value)) {
          results.push({
            key,
            label,
            status: 'invalid',
            message: 'Value must be in {"a","b"} format.',
            error: true
          });
          continue;
        } else {
          // Extract the selected options and validate against allowed options
          const mcqArrayMatch = value.match(/^\{\s*("[^"]*"\s*(,\s*"[^"]*")*)\s*\}$/);
          if (mcqArrayMatch && field.options && Array.isArray(field.options)) {
            const selectedOptions = value.slice(1, -1).split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
            
            // Get allowed options (handle both string arrays and object arrays)
            let allowedMcqOptions: string[] = [];
            if (typeof field.options[0] === 'object' && field.options[0] !== null) {
              allowedMcqOptions = field.options.map((opt: any) => opt.label || opt.value || String(opt));
            } else {
              allowedMcqOptions = field.options;
            }

            // Check if all selected options are valid
            const invalidOptions = selectedOptions.filter((opt: string) => !allowedMcqOptions.includes(opt));
            if (invalidOptions.length > 0) {
              results.push({
                key,
                label,
                status: 'invalid',
                message: `Invalid options: ${invalidOptions.join(', ')}. Allowed: ${allowedMcqOptions.join(', ')}`,
                error: true
              });
              continue;
            }
          }
        }
      }

      if (field.regex && typeof unquotedValue === 'string') {
        try {
          const re = new RegExp(field.regex);
          if (!re.test(unquotedValue)) {
            results.push({
              key,
              label,
              status: 'invalid',
              message: 'Does not match required format.',
              error: true
            });
            continue;
          }
        } catch {}
      }
    }

    // If we get here, the field is valid
    results.push({
      key,
      label,
      status: 'valid',
      message: 'Valid.'
    });
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
        message: 'This field is extra in config file and not present in the template schema.',
        error: true
      });
    });
  }

  return results;
}

// Debug function to help understand conditional logic
export function debugFieldVisibility(parsedData: any, schema: any): any[] {
  if (!schema || !Array.isArray(schema.fields)) return [];

  const debugInfo: any[] = [];

  for (const field of schema.fields) {
    const key = field.key;
    const label = field.label || key;
    const value = parsedData[key];

    const debug: any = {
      key,
      label,
      value,
      hasVisibleIf: !!field.visibleIf,
      visibleIf: field.visibleIf,
      hasMandatoryIf: !!field.mandatoryIf,
      mandatoryIf: field.mandatoryIf,
      isMandatory: !!(field.mandatory || field.required),
      userEditable: field.userEditable !== false && field.editable !== false
    };

    // Evaluate visibility
    if (field.visibleIf) {
      try {
        debug.visible = !!evalVisibleIf(field.visibleIf, parsedData);
        debug.visibilityEvaluation = 'success';
      } catch (error) {
        debug.visible = true; // Default to visible
        debug.visibilityEvaluation = `error: ${error}`;
      }
    } else {
      debug.visible = true;
      debug.visibilityEvaluation = 'no condition';
    }

    // Evaluate mandatory
    if (field.mandatoryIf) {
      try {
        debug.mandatory = !!evalVisibleIf(field.mandatoryIf, parsedData);
        debug.mandatoryEvaluation = 'success';
      } catch (error) {
        debug.mandatory = !!(field.mandatory || field.required);
        debug.mandatoryEvaluation = `error: ${error}`;
      }
    } else {
      debug.mandatory = !!(field.mandatory || field.required);
      debug.mandatoryEvaluation = 'no condition';
    }

    debugInfo.push(debug);
  }

  return debugInfo;
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

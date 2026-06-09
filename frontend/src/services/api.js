/**
 * API service for communicating with the meta-auto-byrexio backend.
 */

/**
 * Standardize backend URL by removing trailing slash if present.
 * @param {string} url 
 * @returns {string}
 */
export const cleanBackendUrl = (url) => {
  if (!url) return '';
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

/**
 * Fetch automation rules from the backend.
 * @param {string} url - Backend base URL
 * @param {string} apiKey - Admin API Key
 * @returns {Promise<Array>} List of rules
 */
export const fetchRules = async (url, apiKey) => {
  const baseUrl = cleanBackendUrl(url);
  const response = await fetch(`${baseUrl}/api/rules`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Server returned error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Sync and save automation rules with the backend.
 * @param {string} url - Backend base URL
 * @param {string} apiKey - Admin API Key
 * @param {Array} rules - Updated rules array to save
 * @returns {Promise<boolean>} Success status
 */
export const saveRules = async (url, apiKey, rules) => {
  const baseUrl = cleanBackendUrl(url);
  const response = await fetch(`${baseUrl}/api/rules`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(rules),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync: ${response.status} ${response.statusText}`);
  }

  return true;
};

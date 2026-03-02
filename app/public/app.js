const passwordField = document.getElementById("password");
const generateButton = document.getElementById("generate");
const shareButton = document.getElementById("share");
const expirySelect = document.getElementById("expiry");
const expiryTypeSelect = document.getElementById("expiry-type");
const expiryTimeRow = document.getElementById("expiry-time-row");
const viewsRow = document.getElementById("views-row");
const viewsLimitInput = document.getElementById("views-limit");
const resultBox = document.getElementById("result");
const shareLinkInput = document.getElementById("share-link");
const copyLinkButton = document.getElementById("copy-link");
const lengthNote = document.getElementById("length-note");
const lengthInput = document.getElementById("length");
const lengthValue = document.getElementById("length-value");
const optionLower = document.getElementById("opt-lower");
const optionUpper = document.getElementById("opt-upper");
const optionNumber = document.getElementById("opt-number");
const optionSpecial = document.getElementById("opt-special");
const passwordTypeSelect = document.getElementById("password-type");
const randomOptions = document.getElementById("random-options");
const passphraseOptions = document.getElementById("passphrase-options");
const keywordsInput = document.getElementById("keywords");
const keywordList = document.getElementById("keyword-list");
const wordCountInput = document.getElementById("word-count");
const wordCountValue = document.getElementById("word-count-value");
const separatorSelect = document.getElementById("separator");
const casingSelect = document.getElementById("casing");
const passRandomLengthInput = document.getElementById("pass-rand-length");
const passRandomLengthValue = document.getElementById("pass-rand-length-value");
const passRandLower = document.getElementById("pass-rand-lower");
const passRandUpper = document.getElementById("pass-rand-upper");
const passRandNumber = document.getElementById("pass-rand-number");
const passRandSpecial = document.getElementById("pass-rand-special");
const passNumber = document.getElementById("pass-number");
const passSymbol = document.getElementById("pass-symbol");

const createView = document.getElementById("create-view");
const viewView = document.getElementById("view-view");
const secretOutput = document.getElementById("secret-output");
const copySecretButton = document.getElementById("copy-secret");
const secretNote = document.getElementById("secret-note");
const securityInfoButton = document.getElementById("security-info");
const securityModal = document.getElementById("security-modal");
const securityClose = document.getElementById("security-close");
const copyright = document.getElementById("copyright");
const footerVersion = document.getElementById("footer-version");
const favicon = document.getElementById("favicon");
const brandLogo = document.getElementById("brand-logo");
const brandTitle = document.getElementById("brand-title");
const brandTagline = document.getElementById("brand-tagline");

const DEFAULT_PASSWORD_LENGTH = 20;
const DEFAULT_WORD_COUNT = 4;
const DEFAULT_PASS_RANDOM_LENGTH = 2;
let publicBaseUrl = "";

const keywordItems = [];
const keywordLookup = new Set();

function applyBranding(branding) {
  if (!branding) return;
  if (branding.primaryColor) {
    document.documentElement.style.setProperty("--primary", branding.primaryColor);
  }
  if (branding.logoUrl && brandLogo) {
    brandLogo.src = branding.logoUrl;
  }
  if (branding.faviconUrl && favicon) {
    favicon.href = branding.faviconUrl;
  }
  if (branding.title && brandTitle) {
    brandTitle.textContent = branding.title;
  }
  if (branding.tagline && brandTagline) {
    brandTagline.textContent = branding.tagline;
  }
  if (branding.siteTitle) {
    document.title = branding.siteTitle;
  }
}

try {
  const cachedBranding = JSON.parse(localStorage.getItem("branding") || "null");
  if (cachedBranding) {
    applyBranding(cachedBranding);
  }
} catch (err) {
  // ignore
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (data && typeof data.publicBaseUrl === "string") {
      publicBaseUrl = data.publicBaseUrl.trim();
    }

    if (footerVersion && data && data.version) {
      footerVersion.textContent = `v${data.version}`;
    }


    if (data && data.branding) {
      applyBranding(data.branding);
      localStorage.setItem("branding", JSON.stringify(data.branding));
    }
  } catch (err) {
    // Ignore config fetch failures; fallback to window.location.origin.
  }
}

function getSelectedLength() {
  const value = Number.parseInt(lengthInput?.value || DEFAULT_PASSWORD_LENGTH, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_PASSWORD_LENGTH;
  }
  return value;
}

function getSelectedWordCount() {
  const value = Number.parseInt(wordCountInput?.value || DEFAULT_WORD_COUNT, 10);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_WORD_COUNT;
  }
  return value;
}

function getSelectedRandomLength() {
  const value = Number.parseInt(passRandomLengthInput?.value || DEFAULT_PASS_RANDOM_LENGTH, 10);
  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_PASS_RANDOM_LENGTH;
  }
  return value;
}

function syncLengthDisplay() {
  const mode = passwordTypeSelect?.value || "random";
  if (mode === "passphrase") {
    const words = getSelectedWordCount();
    const randomLength = getSelectedRandomLength();
    const randomSuffix = randomLength > 0 ? ` + ${randomLength} chars` : "";
    if (wordCountValue) {
      wordCountValue.textContent = String(words);
    }
    if (passRandomLengthValue) {
      passRandomLengthValue.textContent = String(randomLength);
    }
    if (lengthNote) {
      lengthNote.textContent = `Words: ${words}${randomSuffix}`;
    }
    return;
  }

  const length = getSelectedLength();
  if (lengthValue) {
    lengthValue.textContent = String(length);
  }
  if (lengthNote) {
    lengthNote.textContent = `Length: ${length}`;
  }
}

function buildCharset() {
  const parts = [];

  if (optionLower?.checked) {
    parts.push("abcdefghijklmnopqrstuvwxyz");
  }

  if (optionUpper?.checked) {
    parts.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  }

  if (optionNumber?.checked) {
    parts.push("0123456789");
  }

  if (optionSpecial?.checked) {
    parts.push("!@#$%^&*()-_=+[]{}<>?");
  }

  return parts.join("");
}

function generatePassword(length) {
  const charset = buildCharset();

  if (!charset) {
    alert("Select at least one character type.");
    return "";
  }

  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  return Array.from(values, (value) => charset[value % charset.length]).join("");
}

function getRandomInt(max) {
  const values = new Uint32Array(1);
  window.crypto.getRandomValues(values);
  return values[0] % max;
}

function parseKeywords(text) {
  if (!text) return [];
  return text
    .split(/[\s,]+/)
    .map((word) => word.trim())
    .filter(Boolean);
}

function normalizeKeyword(word) {
  return word.toLowerCase();
}

function addKeywordsFromText(text) {
  const words = parseKeywords(text);
  words.forEach((word) => {
    const key = normalizeKeyword(word);
    if (!keywordLookup.has(key)) {
      keywordLookup.add(key);
      keywordItems.push(word);
    }
  });
  renderKeywordChips();
}

function removeKeyword(word) {
  const key = normalizeKeyword(word);
  if (!keywordLookup.has(key)) return;
  keywordLookup.delete(key);
  const index = keywordItems.findIndex((item) => normalizeKeyword(item) === key);
  if (index >= 0) {
    keywordItems.splice(index, 1);
  }
  renderKeywordChips();
}

function renderKeywordChips() {
  if (!keywordList) return;
  keywordList.innerHTML = "";
  keywordItems.forEach((word) => {
    const chip = document.createElement("span");
    chip.className = "keyword-chip";

    const label = document.createElement("span");
    label.textContent = word;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "keyword-remove";
    remove.setAttribute("aria-label", `Remove ${word}`);
    remove.textContent = "x";
    remove.addEventListener("click", () => removeKeyword(word));

    chip.appendChild(label);
    chip.appendChild(remove);
    keywordList.appendChild(chip);
  });
  keywordList.classList.toggle("hidden", keywordItems.length === 0);
}

function getKeywords() {
  const pending = parseKeywords(keywordsInput?.value || "");
  const combined = keywordItems.concat(pending);
  const unique = [];
  const seen = new Set();
  combined.forEach((word) => {
    const key = normalizeKeyword(word);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(word);
    }
  });
  return unique;
}

function shuffleList(items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = getRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function applyCasing(word, mode) {
  if (mode === "upper") return word.toUpperCase();
  if (mode === "lower") return word.toLowerCase();
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function generatePassphrase() {
  const keywords = getKeywords();
  if (!keywords.length) {
    alert("Please enter at least one keyword.");
    return "";
  }

  const filler = [
    "bright",
    "swift",
    "calm",
    "hidden",
    "amber",
    "ridge",
    "north",
    "drift",
    "stone",
    "river",
    "shadow",
    "ember"
  ];

  const count = getSelectedWordCount();
  const casing = casingSelect?.value || "title";
  const separator = separatorSelect?.value || "-";
  const words = [];

  const seeded = shuffleList(keywords);
  seeded.forEach((word) => {
    if (words.length < count) {
      words.push(word);
    }
  });

  while (words.length < count) {
    words.push(filler[getRandomInt(filler.length)]);
  }

  const sentence = shuffleList(words).map((word) => applyCasing(word, casing));
  let passphrase = sentence.join(separator);

  const randomLength = getSelectedRandomLength();
  if (randomLength > 0) {
    const charset = buildPassphraseCharset();
    if (!charset) {
      alert("Select at least one random character type.");
      return "";
    }
    const values = new Uint32Array(randomLength);
    window.crypto.getRandomValues(values);
    passphrase += Array.from(values, (value) => charset[value % charset.length]).join("");
  }

  if (passNumber?.checked) {
    passphrase += String(getRandomInt(10));
  }

  if (passSymbol?.checked) {
    const symbols = ["!", "@", "#", "$", "%", "&", "?"];
    passphrase += symbols[getRandomInt(symbols.length)];
  }

  return passphrase;
}

function buildPassphraseCharset() {
  const parts = [];

  if (passRandLower?.checked) {
    parts.push("abcdefghijklmnopqrstuvwxyz");
  }

  if (passRandUpper?.checked) {
    parts.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  }

  if (passRandNumber?.checked) {
    parts.push("0123456789");
  }

  if (passRandSpecial?.checked) {
    parts.push("!@#$%^&*()-_=+[]{}<>?");
  }

  return parts.join("");
}

function isSecretRoute() {
  const path = window.location.pathname.replace(/^\//, "");
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path);
}

function showSecretView() {
  createView.classList.add("hidden");
  viewView.classList.remove("hidden");
}

function showCreateView() {
  createView.classList.remove("hidden");
  viewView.classList.add("hidden");
}

function syncExpiryMode() {
  const mode = expiryTypeSelect?.value || "time";
  if (!viewsRow || !expiryTimeRow) return;
  if (mode === "views") {
    viewsRow.classList.remove("hidden");
    expiryTimeRow.classList.add("hidden");
  } else {
    viewsRow.classList.add("hidden");
    expiryTimeRow.classList.remove("hidden");
  }
}

async function createSecret() {
  const password = passwordField.value.trim();
  if (!password) {
    alert("Please enter a password.");
    return;
  }

  const expiryValue = expirySelect.value;
  const expiryType = expiryTypeSelect?.value || "time";
  const oneTime = expiryValue === "one-time";
  const expirySeconds = oneTime ? 604800 : Number.parseInt(expiryValue, 10);
  let viewsLimit;
  if (expiryType === "views") {
    const parsedViews = Number.parseInt(viewsLimitInput?.value || "", 10);
    if (!Number.isInteger(parsedViews) || parsedViews < 1) {
      alert("Please enter a valid number of views (min 1).");
      return;
    }
    viewsLimit = parsedViews;
  }

  const response = await fetch("/api/secret", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password, expirySeconds, oneTime, viewsLimit })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to create secret" }));
    alert(error.error || "Unable to create secret");
    return;
  }

  const data = await response.json();
  const baseUrl = publicBaseUrl || window.location.origin;
  const shareUrl = `${baseUrl.replace(/\/$/, "")}/${data.id}`;

  shareLinkInput.value = shareUrl;
  resultBox.classList.remove("hidden");
}

async function loadSecret() {
  const secretId = window.location.pathname.replace(/^\//, "");
  if (!secretId) {
    showCreateView();
    return;
  }

  showSecretView();
  secretOutput.textContent = "Loading secret...";

  const response = await fetch(`/api/secret/${secretId}`);

  if (response.status === 404) {
    secretOutput.textContent = "This secret is expired or has already been viewed.";
    secretNote.textContent = "If this was a one-time secret, it has been deleted.";
    return;
  }

  if (!response.ok) {
    secretOutput.textContent = "Unable to load secret.";
    return;
  }

  const data = await response.json();
  secretOutput.textContent = data.password;
  copySecretButton.classList.remove("hidden");
  if (data.oneTime) {
    secretNote.textContent = "This one-time secret has been deleted after viewing.";
  } else if (typeof data.remainingViews === "number") {
    secretNote.textContent = `Remaining views: ${data.remainingViews}`;
  } else if (data.expiresAt) {
    const expiresAt = new Date(data.expiresAt);
    secretNote.textContent = `This secret will expire on ${expiresAt.toLocaleString()}.`;
  } else {
    secretNote.textContent = "This secret will expire automatically based on its TTL.";
  }
}

function copyToClipboard(input) {
  input.select();
  document.execCommand("copy");
}

function copyText(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  });
}

if (generateButton) {
  generateButton.addEventListener("click", () => {
    const mode = passwordTypeSelect?.value || "random";
    const generated = mode === "passphrase"
      ? generatePassphrase()
      : generatePassword(getSelectedLength());
    if (generated) {
      passwordField.value = generated;
      syncLengthDisplay();
    }
  });
}

if (lengthInput) {
  lengthInput.addEventListener("input", () => {
    syncLengthDisplay();
  });
}

if (wordCountInput) {
  wordCountInput.addEventListener("input", () => {
    syncLengthDisplay();
  });
}

if (passRandomLengthInput) {
  passRandomLengthInput.addEventListener("input", () => {
    syncLengthDisplay();
  });
}

if (keywordsInput) {
  keywordsInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addKeywordsFromText(keywordsInput.value);
      keywordsInput.value = "";
    }
  });

  keywordsInput.addEventListener("blur", () => {
    if (keywordsInput.value.trim()) {
      addKeywordsFromText(keywordsInput.value);
      keywordsInput.value = "";
    }
  });
}

if (shareButton) {
  shareButton.addEventListener("click", () => {
    createSecret().catch(() => alert("Unable to create secret"));
  });
}

if (copyLinkButton) {
  copyLinkButton.addEventListener("click", () => {
    copyToClipboard(shareLinkInput);
  });
}

if (copySecretButton) {
  copySecretButton.addEventListener("click", () => {
    copyText(secretOutput.textContent || "");
  });
}

function openSecurityModal() {
  if (!securityModal) return;
  securityModal.classList.remove("hidden");
}

function closeSecurityModal() {
  if (!securityModal) return;
  securityModal.classList.add("hidden");
}

if (securityInfoButton) {
  securityInfoButton.addEventListener("click", openSecurityModal);
}

if (securityClose) {
  securityClose.addEventListener("click", closeSecurityModal);
}

if (securityModal) {
  securityModal.addEventListener("click", (event) => {
    if (event.target === securityModal) {
      closeSecurityModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeSecurityModal();
  }
});

if (isSecretRoute()) {
  loadSecret().catch(() => {
    secretOutput.textContent = "Unable to load secret.";
  });
} else {
  syncPasswordMode();
  syncExpiryMode();
  showCreateView();
}

loadConfig().catch(() => {
  // noop
});

if (copyright) {
  const year = new Date().getFullYear();
  const versionText = footerVersion?.textContent?.trim();
  const versionSuffix = versionText ? ` | ${versionText}` : "";
  copyright.innerHTML = `Copyright © ${year} <a class="footer-link" href="https://github.com/insert-waffle" target="_blank" rel="noreferrer">insert-waffle</a>${versionSuffix}.`;
}

if (expiryTypeSelect) {
  expiryTypeSelect.addEventListener("change", syncExpiryMode);
}

function syncPasswordMode() {
  const mode = passwordTypeSelect?.value || "random";
  if (mode === "passphrase") {
    randomOptions?.classList.add("hidden");
    passphraseOptions?.classList.remove("hidden");
  } else {
    randomOptions?.classList.remove("hidden");
    passphraseOptions?.classList.add("hidden");
  }
  syncLengthDisplay();
}

if (passwordTypeSelect) {
  passwordTypeSelect.addEventListener("change", syncPasswordMode);
}

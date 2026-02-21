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
let publicBaseUrl = "";

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

function syncLengthDisplay() {
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
    const generated = generatePassword(getSelectedLength());
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
  syncLengthDisplay();
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

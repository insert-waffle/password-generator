(function () {
  try {
    const branding = JSON.parse(localStorage.getItem("branding") || "null");
    if (!branding) return;
    if (branding.primaryColor) {
      document.documentElement.style.setProperty("--primary", branding.primaryColor);
    }
    if (branding.siteTitle) {
      document.title = branding.siteTitle;
    }
    if (branding.faviconUrl) {
      const icon = document.querySelector("link[rel='icon']");
      if (icon) icon.href = branding.faviconUrl;
    }
  } catch (err) {
    // ignore
  }
})();

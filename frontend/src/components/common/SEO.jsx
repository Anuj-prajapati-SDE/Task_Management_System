import React, { useEffect } from 'react';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  robots = 'index, follow', 
  ogTitle, 
  ogDescription, 
  ogImage, 
  ogUrl, 
  schema 
}) => {
  useEffect(() => {
    // 1. Update Title
    const defaultTitle = 'TaskFlow - Role-Based Task Management';
    document.title = title ? `${title} | TaskFlow` : defaultTitle;

    // Helper to create or update meta tags
    const updateMetaTag = (name, value, isProperty = false) => {
      if (value === undefined || value === null) return;
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${name}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', value);
    };

    // 2. Update Standard Meta Tags
    updateMetaTag('description', description || 'Streamline task delegation, track real-time progress, and boost productivity with TaskFlow.');
    updateMetaTag('keywords', keywords || 'task management, project management, role-based workflow, task delegation, team collaboration');
    updateMetaTag('robots', robots);

    // 3. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', ogUrl || window.location.href);

    // 4. Update Open Graph Meta Tags
    updateMetaTag('og:title', ogTitle || title || 'TaskFlow', true);
    updateMetaTag('og:description', ogDescription || description || 'Streamline task delegation, track real-time progress, and boost productivity with TaskFlow.', true);
    updateMetaTag('og:image', ogImage || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="%234f46e5"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="80" font-weight="800" fill="white">TaskFlow</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="32" font-weight="500" fill="%23c7d2fe">Role-Based Task Management System</text></svg>', true);
    updateMetaTag('og:url', ogUrl || window.location.href, true);
    updateMetaTag('og:type', 'website', true);

    // 5. Update Twitter Meta Tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', ogTitle || title || 'TaskFlow');
    updateMetaTag('twitter:description', ogDescription || description || 'Streamline task delegation, track real-time progress, and boost productivity with TaskFlow.');
    updateMetaTag('twitter:image', ogImage || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="%234f46e5"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="80" font-weight="800" fill="white">TaskFlow</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, sans-serif" font-size="32" font-weight="500" fill="%23c7d2fe">Role-Based Task Management System</text></svg>');

    // 6. Ingest Structured Data (JSON-LD)
    let schemaScript = document.getElementById('seo-jsonld-schema');
    if (schema) {
      if (!schemaScript) {
        schemaScript = document.createElement('script');
        schemaScript.id = 'seo-jsonld-schema';
        schemaScript.setAttribute('type', 'application/ld+json');
        document.head.appendChild(schemaScript);
      }
      schemaScript.textContent = JSON.stringify(schema);
    } else if (schemaScript) {
      schemaScript.remove();
    }

    // Cleanup: remove schema tag on unmount if it exists
    return () => {
      const tag = document.getElementById('seo-jsonld-schema');
      if (tag) tag.remove();
    };
  }, [title, description, keywords, robots, ogTitle, ogDescription, ogImage, ogUrl, schema]);

  return null;
};

export default SEO;

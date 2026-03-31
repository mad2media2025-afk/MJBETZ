import { useEffect } from 'react'

export const SEOSchema = () => {
  useEffect(() => {
    // Organization Schema Markup
    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'MJBET',
      'url': 'https://mjbet.vercel.app',
      'logo': 'https://mjbet.vercel.app/logo.png',
      'description': 'Secure IPL cricket betting platform with licensed operators and responsible gambling features',
      'sameAs': [
        'https://twitter.com/mjbet',
        'https://facebook.com/mjbet',
        'https://instagram.com/mjbet'
      ],
      'contactPoint': {
        '@type': 'ContactPoint',
        'telephone': '+91-XXXXXXXXXX',
        'contactType': 'Customer Service',
        'email': 'support@mjbet.com'
      },
      'address': {
        '@type': 'PostalAddress',
        'addressCountry': 'IN',
        'addressLocality': 'India'
      }
    }

    // LocalBusiness Schema (for regional targeting)
    const localBusinessSchema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': 'MJBET - IPL Cricket Betting',
      'image': 'https://mjbet.vercel.app/og-image.png',
      'url': 'https://mjbet.vercel.app',
      'telephone': '+91-XXXXXXXXXX',
      'priceRange': '$',
      'geo': {
        '@type': 'GeoShape',
        'addressCountry': 'IN'
      },
      'areaServed': 'IN'
    }

    // BreadcrumbList Schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': 'https://mjbet.vercel.app'
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': 'IPL Betting Guide',
          'item': 'https://mjbet.vercel.app/ipl-betting-guide'
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': 'Betting Strategies',
          'item': 'https://mjbet.vercel.app/betting-strategies'
        }
      ]
    }

    // FAQPage Schema
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': [
        {
          '@type': 'Question',
          'name': 'Is MJBET a licensed betting platform?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Yes, MJBET is a fully licensed and regulated IPL betting platform complying with all applicable gaming regulations.'
          }
        },
        {
          '@type': 'Question',
          'name': 'How do I place a bet on MJBET?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Create an account, deposit funds securely, select your match, choose your bet type, and confirm your wager.'
          }
        },
        {
          '@type': 'Question',
          'name': 'What is responsible gambling?',
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': 'Responsible gambling means betting within your means, setting limits, and recognizing when to stop.'
          }
        }
      ]
    }

    // Add Organization Schema
    let orgScript = document.getElementById('org-schema') as HTMLScriptElement
    if (!orgScript) {
      orgScript = document.createElement('script') as HTMLScriptElement
      orgScript.id = 'org-schema'
      orgScript.type = 'application/ld+json'
      orgScript.innerHTML = JSON.stringify(organizationSchema)
      document.head.appendChild(orgScript)
    }

    // Add LocalBusiness Schema
    let localScript = document.getElementById('local-schema') as HTMLScriptElement
    if (!localScript) {
      localScript = document.createElement('script') as HTMLScriptElement
      localScript.id = 'local-schema'
      localScript.type = 'application/ld+json'
      localScript.innerHTML = JSON.stringify(localBusinessSchema)
      document.head.appendChild(localScript)
    }

    // Add Breadcrumb Schema
    let breadcrumbScript = document.getElementById('breadcrumb-schema') as HTMLScriptElement
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script') as HTMLScriptElement
      breadcrumbScript.id = 'breadcrumb-schema'
      breadcrumbScript.type = 'application/ld+json'
      breadcrumbScript.innerHTML = JSON.stringify(breadcrumbSchema)
      document.head.appendChild(breadcrumbScript)
    }

    // Add FAQ Schema
    let faqScript = document.getElementById('faq-schema') as HTMLScriptElement
    if (!faqScript) {
      faqScript = document.createElement('script') as HTMLScriptElement
      faqScript.id = 'faq-schema'
      faqScript.type = 'application/ld+json'
      faqScript.innerHTML = JSON.stringify(faqSchema)
      document.head.appendChild(faqScript)
    }

    // Add HSTS Header (for security - note: best done server-side)
    // This is informational - actual HSTS should be set on Vercel config
    console.log('SEO Schema markup loaded successfully')

  }, [])

  // This component doesn't render anything visible
  return null
}

import type {
  Fact,
  CannedQA,
  Correction,
  GlossaryItem,
  Intent,
  Metadata,
  KnowledgeSource,
} from './types';

const FILE_TYPE_MAP: Record<string, string> = {
  pdf: 'PDF Document',
  docx: 'Word Document',
  doc: 'Word Document',
  txt: 'Text File',
  md: 'Markdown File',
  rtf: 'Rich Text',
  html: 'HTML Page',
  xml: 'XML Data',
  json: 'JSON Data',
  csv: 'CSV Spreadsheet',
  pptx: 'PowerPoint',
  png: 'Image (OCR)',
  jpg: 'Image (OCR)',
  jpeg: 'Image (OCR)',
  webp: 'Image (OCR)',
  gif: 'Image (OCR)',
  eml: 'Email',
  email: 'Email',
  zip: 'Archive',
};

export function getFileTypeLabel(ext: string): string {
  return FILE_TYPE_MAP[ext.toLowerCase()] || 'Unknown';
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

export function normalizeFilename(filename: string): string {
  const ext = getFileExtension(filename);
  const base = filename.replace(/\.[^.]+$/, '');
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${ext === 'md' ? 'md' : 'md'}`;
}

const NORMALIZE_TEMPLATES: Record<string, (name: string) => string> = {
  pdf: (name) => `# ${name}\n\n[Content extracted from PDF via pdfjs-dist]\n\nThis document was parsed and converted to Markdown during normalization.`,
  docx: (name) => `# ${name}\n\n[Content extracted from DOCX via mammoth]\n\nThis Word document was converted to Markdown during normalization.`,
  txt: (name) => `# ${name}\n\nRaw text content imported directly. No conversion needed.`,
  md: (name) => `# ${name}\n\nMarkdown content imported directly. No conversion needed.`,
  html: (name) => `# ${name}\n\n[Content extracted from HTML via turndown]\n\nThis HTML page was converted to Markdown during normalization.`,
  xml: (name) => `# ${name}\n\n[Content extracted from XML via fast-xml-parser]\n\nThis XML data was structured and converted to Markdown.`,
  json: (name) => `# ${name}\n\n[Content extracted from JSON]\n\nThis JSON data was flattened and converted to Markdown.`,
  csv: (name) => `# ${name}\n\n[Content extracted from CSV via papaparse]\n\nThis spreadsheet was converted to a Markdown table.`,
  pptx: (name) => `# ${name}\n\n[Content extracted from PowerPoint]\n\nThis presentation was converted to Markdown during normalization.`,
  png: (name) => `# ${name}\n\n[Content extracted via OCR using tesseract.js]\n\nThis image was processed with optical character recognition.`,
  jpg: (name) => `# ${name}\n\n[Content extracted via OCR using tesseract.js]\n\nThis image was processed with optical character recognition.`,
  jpeg: (name) => `# ${name}\n\n[Content extracted via OCR using tesseract.js]\n\nThis image was processed with optical character recognition.`,
  webp: (name) => `# ${name}\n\n[Content extracted via OCR using tesseract.js]\n\nThis image was processed with optical character recognition.`,
  gif: (name) => `# ${name}\n\n[Content extracted via OCR using tesseract.js]\n\nThis image was processed with optical character recognition.`,
  eml: (name) => `# ${name}\n\n[Content extracted from email]\n\nThis email was parsed and converted to Markdown.`,
  email: (name) => `# ${name}\n\n[Content extracted from email]\n\nThis email was parsed and converted to Markdown.`,
  zip: (name) => `# ${name}\n\n[Archive extracted and contents normalized individually]`,
};

export function generateNormalizedContent(filename: string): string {
  const ext = getFileExtension(filename);
  const base = filename.replace(/\.[^.]+$/, '');
  const template = NORMALIZE_TEMPLATES[ext];
  if (template) return template(base);
  return `# ${base}\n\n[Content normalized from unknown format]`;
}

interface ExtractionConfig {
  type: string;
  name: string;
}

const TYPE_TEMPLATES: Record<string, {
  master: (name: string, sources: KnowledgeSource[]) => string;
  facts: () => Fact[];
  entities: () => string[];
  qas: () => CannedQA[];
  corrections: () => Correction[];
  glossary: () => GlossaryItem[];
  intents: () => Intent[];
  summary: (name: string, sourceCount: number, factCount: number) => string;
}> = {
  portfolio: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nThis knowledge package contains curated information about a professional portfolio, compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## Skills\n- Programming languages, frameworks, and tools extracted from source documents\n- Deduplicated and canonicalized (e.g., "Java 8", "JAVA8", "Java SE 8" → "Java 8")\n\n## Employment History\n- Companies, roles, technologies, and durations extracted and deduplicated\n- Example: "Worked at Scientific Games" and "Developer at Scientific Games" unified under a single employer entry\n\n## Projects\n- Notable projects with technologies, descriptions, and outcomes\n\n## Achievements\n- Certifications, awards, and metrics extracted from sources\n\n## Education\n- Degrees, institutions, and dates\n\n## Contact\n- Available contact information from sources\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'skill', value: 'Java 8 expertise' },
      { id: 'fact-002', category: 'skill', value: 'React development' },
      { id: 'fact-003', category: 'skill', value: 'Quarkus framework' },
      { id: 'fact-004', category: 'skill', value: 'Apache Kafka' },
      { id: 'fact-005', category: 'employment', value: 'Senior Java Developer at Scientific Games' },
      { id: 'fact-006', category: 'employment', value: '12+ years Java experience' },
      { id: 'fact-007', category: 'employment', value: '5+ years React experience' },
      { id: 'fact-008', category: 'project', value: 'Cloud-native microservices architecture' },
      { id: 'fact-009', category: 'achievement', value: 'Multiple certifications in cloud technologies' },
      { id: 'fact-010', category: 'education', value: 'Degree in Computer Science' },
    ],
    entities: () => ['Java', 'Quarkus', 'Kafka', 'Scientific Games', 'React', 'Oracle', 'Cloud', 'Microservices', 'TypeScript', 'PostgreSQL'],
    qas: () => [
      { question: 'What technologies do you know?', answer: 'I have expertise in Java 8 (12+ years), React (5+ years), Quarkus, Apache Kafka, and various cloud technologies. I also work with TypeScript and PostgreSQL.' },
      { question: 'Where have you worked?', answer: 'I have worked at Scientific Games as a Senior Java Developer, among other roles. My full employment history is available in the master document.' },
      { question: 'What is your most notable project?', answer: 'I designed and implemented a cloud-native microservices architecture using Quarkus and Kafka for high-throughput enterprise systems.' },
      { question: 'How many years of experience do you have?', answer: 'I have 12+ years of Java development experience and 5+ years working with React.' },
    ],
    corrections: () => [
      { priority: 'critical', rule: 'Scientific Games uses Quarkus, not Spring Boot' },
      { priority: 'warning', rule: 'Java experience is 12+ years, not 10 years — do not understate' },
      { priority: 'info', rule: 'Always refer to Java 8 as the minimum version unless a higher version is specified' },
    ],
    glossary: () => [
      { term: 'Quarkus', description: 'Cloud-native, container-first Java framework optimized for fast startup and low memory footprint' },
      { term: 'Kafka', description: 'Distributed event streaming platform for high-throughput, fault-tolerant data pipelines' },
      { term: 'Microservices', description: 'Architectural style where applications are built as small, independent, loosely coupled services' },
    ],
    intents: () => [
      { intent: 'skills_query', patterns: ['what technologies', 'what skills', 'what do you know', 'tech stack'] },
      { intent: 'experience_query', patterns: ['how many years', 'experience with', 'how long'] },
      { intent: 'employment_query', patterns: ['where did you work', 'previous jobs', 'employment', 'work history'] },
      { intent: 'contact', patterns: ['contact', 'email', 'reach', 'get in touch'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nA comprehensive knowledge package built from **${sc} source${sc !== 1 ? 's' : ''}**, containing **${fc} extracted facts** across skills, employment, projects, and achievements. The package has been deduplicated and canonicalized into a single master document, with generated assets including a vector index for semantic search, canned Q&A for zero-token responses, and correction guardrails for answer accuracy.`,
  },
  apartments: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nThis knowledge package contains apartment listing information compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## Properties\n- Apartment listings with locations, prices, amenities, and availability\n- Deduplicated units and unified pricing descriptions\n\n## Amenities\n- Extracted from listing descriptions and standardized\n- Example: "pets ok", "pet friendly", "dogs allowed" → "Pet Friendly"\n\n## Policies\n- Lease terms, deposit requirements, and application criteria\n\n## Location\n- Neighborhood descriptions, transit access, and nearby attractions\n\n## Contact\n- Leasing office information and application procedures\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'property', value: '2-bedroom apartment available at $2,200/month' },
      { id: 'fact-002', category: 'amenity', value: 'Pet Friendly' },
      { id: 'fact-003', category: 'amenity', value: 'In-unit laundry' },
      { id: 'fact-004', category: 'amenity', value: 'Fitness center' },
      { id: 'fact-005', category: 'policy', value: '12-month lease minimum' },
      { id: 'fact-006', category: 'policy', value: 'Security deposit equal to one month rent' },
      { id: 'fact-007', category: 'location', value: '5-minute walk to metro station' },
      { id: 'fact-008', category: 'property', value: '1-bedroom apartment available at $1,800/month' },
    ],
    entities: () => ['Pet Friendly', 'Fitness Center', 'Laundry', 'Metro', 'Lease', 'Deposit', 'Bedroom', 'Bathroom'],
    qas: () => [
      { question: 'Are pets allowed?', answer: 'Yes, the apartments are pet friendly. Please contact the leasing office for specific pet policies and any associated fees.' },
      { question: 'What are the lease terms?', answer: 'The minimum lease term is 12 months. A security deposit equal to one month of rent is required.' },
      { question: 'How much is a 2-bedroom apartment?', answer: 'A 2-bedroom apartment is available at $2,200 per month. A 1-bedroom is also available at $1,800 per month.' },
      { question: 'Is there public transit nearby?', answer: 'Yes, the properties are a 5-minute walk to the nearest metro station, providing easy access to public transportation.' },
    ],
    corrections: () => [
      { priority: 'critical', rule: 'Always confirm current pricing — prices are subject to change and availability' },
      { priority: 'warning', rule: 'Pet policy details (breed restrictions, weight limits) must be confirmed with the leasing office' },
    ],
    glossary: () => [
      { term: 'Pet Friendly', description: 'Apartments that allow pets, subject to breed and weight restrictions' },
      { term: 'Lease Term', description: 'The minimum duration a tenant must commit to, typically 12 months' },
    ],
    intents: () => [
      { intent: 'pricing_query', patterns: ['how much', 'price', 'rent', 'cost'] },
      { intent: 'amenity_query', patterns: ['amenities', 'features', 'what is included', 'gym', 'laundry'] },
      { intent: 'pet_query', patterns: ['pets', 'dogs', 'cats', 'pet friendly', 'animals'] },
      { intent: 'lease_query', patterns: ['lease', 'contract', 'how long', 'terms', 'deposit'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nAn apartment knowledge package built from **${sc} source${sc !== 1 ? 's' : ''}** with **${fc} extracted facts** covering property listings, amenities, policies, and location details. Includes pet policies, lease terms, and pricing guardrails to ensure accurate responses to prospective tenants.`,
  },
  company: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nCompany knowledge package compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## About\n- Company mission, vision, and values extracted from source documents\n- Deduplicated and canonicalized across all materials\n\n## Products & Services\n- Full product catalog with descriptions and key features\n\n## Team\n- Key team members, roles, and departments\n\n## History\n- Founded date, milestones, and growth timeline\n\n## Contact\n- Official contact channels and office locations\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'about', value: 'Company founded in 2018' },
      { id: 'fact-002', category: 'about', value: 'Mission: Transform content into AI-ready knowledge' },
      { id: 'fact-003', category: 'product', value: 'Omni Knowledge Maker — content-to-knowledge platform' },
      { id: 'fact-004', category: 'product', value: 'Chat Widget Buddy — embeddable AI assistant' },
      { id: 'fact-005', category: 'product', value: 'Bot Builder Suite — Telegram bot framework' },
      { id: 'fact-006', category: 'team', value: 'Cross-functional team with expertise in AI and web technologies' },
    ],
    entities: () => ['Knowledge Maker', 'Chat Widget', 'Bot Builder', 'AI Gateway', 'Orama', 'Supabase', 'Telegram'],
    qas: () => [
      { question: 'What does the company do?', answer: 'The company builds platforms that transform any type of content into AI-ready knowledge packages, which can then power chat widgets, Telegram bots, and other AI assistants.' },
      { question: 'What products are available?', answer: 'The product suite includes Omni Knowledge Maker (content processing), Chat Widget Buddy (embeddable assistants), and Bot Builder Suite (Telegram bot framework).' },
      { question: 'When was the company founded?', answer: 'The company was founded in 2018.' },
    ],
    corrections: () => [
      { priority: 'critical', rule: 'Always refer to the platform as "Omni Knowledge Maker" not "Knowledge Builder"' },
    ],
    glossary: () => [
      { term: 'Knowledge Package', description: 'A complete, self-contained set of AI-ready knowledge files generated from source documents' },
      { term: 'AI Gateway Hub', description: 'A unified interface for routing AI requests across multiple providers (OpenAI, Gemini, Claude, Groq)' },
    ],
    intents: () => [
      { intent: 'about_query', patterns: ['what do you do', 'about the company', 'mission', 'what is'] },
      { intent: 'product_query', patterns: ['products', 'services', 'what do you offer', 'features'] },
      { intent: 'contact', patterns: ['contact', 'email', 'reach', 'office'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nA company knowledge package from **${sc} source${sc !== 1 ? 's' : ''}** with **${fc} extracted facts** covering mission, products, team, and history. Designed to power customer-facing AI assistants with accurate, consistent company information.`,
  },
  product: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nProduct knowledge package compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## Product Description\n- Features, use cases, and value propositions extracted and deduplicated\n\n## Pricing\n- Plan tiers, feature comparison, and pricing details\n\n## Documentation\n- Setup guides, API references, and integration steps\n\n## FAQ\n- Common questions and answers from documentation and support materials\n\n## Troubleshooting\n- Known issues and resolution steps\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'feature', value: 'Multi-format source upload (PDF, DOCX, images, etc.)' },
      { id: 'fact-002', category: 'feature', value: 'Automatic normalization to Markdown' },
      { id: 'fact-003', category: 'feature', value: 'AI-powered knowledge extraction' },
      { id: 'fact-004', category: 'feature', value: 'Deduplication engine for clean knowledge' },
      { id: 'fact-005', category: 'pricing', value: 'Free tier with 3 knowledge packages' },
      { id: 'fact-006', category: 'pricing', value: 'Pro tier with unlimited packages and advanced AI' },
    ],
    entities: () => ['Knowledge Package', 'Normalization', 'Deduplication', 'Vector Index', 'Markdown', 'OCR'],
    qas: () => [
      { question: 'What file types are supported?', answer: 'The platform supports PDF, DOCX, TXT, MD, RTF, HTML, XML, JSON, CSV, PPTX, PNG, JPG, WEBP, GIF, EMAIL, and ZIP files.' },
      { question: 'How does the deduplication work?', answer: 'The deduplication engine identifies semantically equivalent entities across all sources and unifies them under canonical names. For example, "Java 8", "JAVA8", and "Java SE 8" all become "Java 8".' },
      { question: 'Is there a free tier?', answer: 'Yes, the free tier includes 3 knowledge packages. The Pro tier offers unlimited packages and advanced AI processing.' },
    ],
    corrections: () => [
      { priority: 'critical', rule: 'Do not claim support for file types not listed in the supported formats' },
      { priority: 'warning', rule: 'Always clarify that web URLs and GitHub repos are planned but not yet available' },
    ],
    glossary: () => [
      { term: 'Master Document', description: 'The canonical Markdown file that serves as the single source of truth for a knowledge package' },
      { term: 'Canned Q&A', description: 'Pre-generated question-answer pairs that provide instant, token-free responses' },
    ],
    intents: () => [
      { intent: 'feature_query', patterns: ['what can it do', 'features', 'capabilities', 'supported'] },
      { intent: 'pricing_query', patterns: ['how much', 'price', 'plans', 'cost', 'free'] },
      { intent: 'setup_query', patterns: ['how to', 'setup', 'getting started', 'install'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nA product knowledge package from **${sc} source${sc !== 1 ? 's' : ''}** with **${fc} extracted facts** covering features, pricing, documentation, and FAQs. Optimized for product support assistants and customer-facing AI.`,
  },
  support: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nCustomer support knowledge package compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## Common Issues\n- Frequently reported problems with solutions extracted and categorized\n\n## Procedures\n- Step-by-step guides for common support tasks\n\n## Policies\n- Returns, refunds, warranty terms, and service level agreements\n\n## Escalation\n- When and how to escalate issues to human support\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'issue', value: 'Login issues resolved by clearing browser cache' },
      { id: 'fact-002', category: 'issue', value: 'Payment failures often caused by expired cards' },
      { id: 'fact-003', category: 'policy', value: '30-day return policy on all products' },
      { id: 'fact-004', category: 'policy', value: 'Full refund available within 14 days of purchase' },
      { id: 'fact-005', category: 'procedure', value: 'Password reset via email link' },
    ],
    entities: () => ['Login', 'Payment', 'Return', 'Refund', 'Warranty', 'Password', 'Cache', 'Escalation'],
    qas: () => [
      { question: 'How do I reset my password?', answer: 'You can reset your password by clicking the "Forgot Password" link on the login page. A reset link will be sent to your email address.' },
      { question: 'What is the return policy?', answer: 'We offer a 30-day return policy on all products. Full refunds are available within 14 days of purchase.' },
      { question: 'Why can I not log in?', answer: 'Login issues are often resolved by clearing your browser cache and cookies. If the problem persists, try resetting your password or contact support.' },
    ],
    corrections: () => [
      { priority: 'critical', rule: 'Always state the return policy as 30 days — do not say 14 days for returns' },
      { priority: 'critical', rule: 'Do not promise refunds beyond the 14-day full refund window' },
    ],
    glossary: () => [
      { term: 'SLA', description: 'Service Level Agreement — the guaranteed response and resolution time for support tickets' },
      { term: 'Escalation', description: 'The process of transferring a support issue to a higher tier of support' },
    ],
    intents: () => [
      { intent: 'login_issue', patterns: ['cannot login', "can't log in", 'login problem', 'locked out'] },
      { intent: 'payment_issue', patterns: ['payment failed', 'charge', 'billing', 'card'] },
      { intent: 'return_query', patterns: ['return', 'refund', 'money back', 'exchange'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nA support knowledge package from **${sc} source${sc !== 1 ? 's' : ''}** with **${fc} extracted facts** covering common issues, procedures, and policies. Includes critical guardrails to prevent incorrect policy statements.`,
  },
  legal: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nLegal knowledge package compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## Terms & Conditions\n- Extracted and structured from legal documents\n\n## Privacy Policy\n- Data handling practices and user rights\n\n## Compliance\n- Regulatory requirements and compliance status\n\n## Disclaimers\n- Legal disclaimers and limitations of liability\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'terms', value: 'Users must be 18 or older to use the service' },
      { id: 'fact-002', category: 'privacy', value: 'Data is encrypted in transit and at rest' },
      { id: 'fact-003', category: 'privacy', value: 'Users can request data deletion at any time' },
      { id: 'fact-004', category: 'compliance', value: 'GDPR compliant data handling practices' },
    ],
    entities: () => ['GDPR', 'Privacy Policy', 'Terms', 'Encryption', 'Data Deletion', 'Compliance'],
    qas: () => [
      { question: 'Is my data secure?', answer: 'Yes, all data is encrypted both in transit and at rest. We follow GDPR-compliant data handling practices.' },
      { question: 'Can I delete my data?', answer: 'Yes, you can request data deletion at any time by contacting our support team.' },
      { question: 'Who can use the service?', answer: 'Users must be 18 years or older to use the service.' },
    ],
    corrections: () => [
      { priority: 'critical', rule: 'Always recommend consulting a legal professional for specific legal questions' },
      { priority: 'critical', rule: 'Do not provide legal advice — only restate information from the documents' },
    ],
    glossary: () => [
      { term: 'GDPR', description: 'General Data Protection Regulation — EU data protection law governing personal data processing' },
      { term: 'Encryption at Rest', description: 'Data encryption applied to stored data, protecting it from unauthorized access' },
    ],
    intents: () => [
      { intent: 'privacy_query', patterns: ['privacy', 'data', 'personal information', 'tracking'] },
      { intent: 'terms_query', patterns: ['terms', 'conditions', 'agreement', 'rules'] },
      { intent: 'compliance_query', patterns: ['gdpr', 'compliance', 'regulation', 'legal'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nA legal knowledge package from **${sc} source${sc !== 1 ? 's' : ''}** with **${fc} extracted facts** covering terms, privacy, compliance, and disclaimers. Includes critical guardrails to prevent providing legal advice.`,
  },
  custom: {
    master: (name, sources) => {
      const sourceList = sources.map((s) => `- ${s.normalized_name || s.filename}`).join('\n');
      return `# ${name}\n\n## Overview\nCustom knowledge package compiled from ${sources.length} source${sources.length !== 1 ? 's' : ''}.\n\n## Sources Normalized\n${sourceList}\n\n## Extracted Knowledge\n- Facts, entities, and relationships extracted from source documents\n- Deduplicated and canonicalized for consistency\n\n## Key Topics\n- Main subjects identified across all sources\n\n## Important Notes\n- Rules, warnings, and guardrails extracted from content\n\n---\n*Generated by Omni Knowledge Maker. This file is the single source of truth — all other assets are derived from it.*`;
    },
    facts: () => [
      { id: 'fact-001', category: 'general', value: 'Key information extracted from source documents' },
      { id: 'fact-002', category: 'general', value: 'Entities and relationships identified through AI extraction' },
      { id: 'fact-003', category: 'general', value: 'Deduplicated content for consistent knowledge representation' },
    ],
    entities: () => ['Knowledge', 'Sources', 'Entities', 'Facts', 'Documents'],
    qas: () => [
      { question: 'What is this knowledge package about?', answer: 'This is a custom knowledge package containing information extracted from your uploaded source documents. All content has been normalized, deduplicated, and structured for AI consumption.' },
    ],
    corrections: () => [
      { priority: 'info', rule: 'Verify extracted information against original sources for critical decisions' },
    ],
    glossary: () => [
      { term: 'Knowledge Package', description: 'A self-contained set of AI-ready knowledge files generated from source documents' },
    ],
    intents: () => [
      { intent: 'general_query', patterns: ['what is', 'tell me about', 'explain', 'information'] },
    ],
    summary: (name, sc, fc) => `## ${name}\n\nA custom knowledge package from **${sc} source${sc !== 1 ? 's' : ''}** with **${fc} extracted facts**. Content has been normalized, deduplicated, and structured into a master document with generated search and Q&A assets.`,
  },
};

export function generateMasterDoc(type: string, name: string, sources: KnowledgeSource[]): string {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.master(name, sources);
}

export function generateFacts(type: string): Fact[] {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.facts();
}

export function generateEntities(type: string): string[] {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.entities();
}

export function generateCannedQA(type: string): CannedQA[] {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.qas();
}

export function generateCorrections(type: string): Correction[] {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.corrections();
}

export function generateGlossary(type: string): GlossaryItem[] {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.glossary();
}

export function generateIntents(type: string): Intent[] {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.intents();
}

export function generateSummary(type: string, name: string, sourceCount: number, factCount: number): string {
  const template = TYPE_TEMPLATES[type] || TYPE_TEMPLATES.custom;
  return template.summary(name, sourceCount, factCount);
}

export function generateMetadata(slug: string, version: string, sources: number, facts: number): Metadata {
  return {
    id: slug,
    version,
    sources,
    facts,
    generated_at: new Date().toISOString(),
  };
}

export function generateVectorIndex(masterDoc: string): { chunks: { id: string; text: string; embedding: number[] }[] } {
  const paragraphs = masterDoc.split('\n\n').filter((p) => p.trim().length > 20);
  return {
    chunks: paragraphs.map((chunk, i) => ({
      id: `chunk-${String(i + 1).padStart(3, '0')}`,
      text: chunk.trim(),
      embedding: Array.from({ length: 8 }, () => Math.round(Math.random() * 1000) / 1000),
    })),
  };
}

export const PROCESSING_STAGES = [
  { id: 'normalization', label: 'Normalization', description: 'Converting all sources to Markdown' },
  { id: 'extraction', label: 'Knowledge Intelligence', description: 'AI extracting facts, entities, and relationships' },
  { id: 'deduplication', label: 'Deduplication Engine', description: 'Unifying duplicate entities and facts' },
  { id: 'master', label: 'Master Knowledge Builder', description: 'Generating the canonical master.md document' },
  { id: 'generation', label: 'Asset Generation', description: 'Creating facts, Q&A, glossary, and vector index' },
] as const;

export type ProcessingStageId = (typeof PROCESSING_STAGES)[number]['id'];

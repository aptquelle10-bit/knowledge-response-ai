import {
  Package,
  Briefcase,
  Building2,
  Home,
  ShoppingCart,
  LifeBuoy,
  Scale,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export const PACKAGE_ICONS: Record<string, LucideIcon> = {
  Package,
  Briefcase,
  Building2,
  Home,
  ShoppingCart,
  LifeBuoy,
  Scale,
  Sparkles,
};

export function getPackageIcon(name: string): LucideIcon {
  return PACKAGE_ICONS[name] || Package;
}

export const PACKAGE_TYPE_OPTIONS: { value: string; label: string; icon: string; color: string; description: string }[] = [
  { value: 'portfolio', label: 'Portfolio', icon: 'Briefcase', color: '#06b6d4', description: 'Personal/professional portfolio with skills, experience, and projects' },
  { value: 'apartments', label: 'Apartments', icon: 'Home', color: '#10b981', description: 'Property listings, amenities, pricing, and leasing info' },
  { value: 'company', label: 'Company', icon: 'Building2', color: '#3b82f6', description: 'Company information, products, team, and history' },
  { value: 'product', label: 'Product', icon: 'ShoppingCart', color: '#f59e0b', description: 'Product features, pricing, docs, and FAQs' },
  { value: 'support', label: 'Support', icon: 'LifeBuoy', color: '#8b5cf6', description: 'Help desk articles, procedures, and policies' },
  { value: 'legal', label: 'Legal', icon: 'Scale', color: '#ef4444', description: 'Terms, privacy policy, compliance, and disclaimers' },
  { value: 'custom', label: 'Custom', icon: 'Sparkles', color: '#06b6d4', description: 'Any other type of knowledge you want to structure' },
];

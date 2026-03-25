export interface StatusBarProps {
  type: string;
  content: string;
  metadata?: any;
}

export interface StatusAttribute {
  label: string;
  value: string | number;
  icon?: string;
  color?: string;
}

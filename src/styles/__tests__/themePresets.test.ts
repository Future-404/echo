import { describe, it, expect } from 'vitest';
import { DEFAULT_CSS_PACKAGES } from '../themePresets';

describe('themePresets - CSS packages', () => {
  it('preset-cyber-echo has no backdrop-filter on config panel', () => {
    const cyber = DEFAULT_CSS_PACKAGES.find(p => p.id === 'preset-cyber-echo');
    expect(cyber).toBeDefined();
    // backdrop-filter on .echo-config-panel was removed to fix fullscreen layout
    const configPanelRule = cyber!.css.match(/\.echo-config-panel\s*\{[^}]*backdrop-filter/);
    expect(configPanelRule).toBeNull();
  });

  it('preset-social-chat bubble CSS has arrow styles', () => {
    const social = DEFAULT_CSS_PACKAGES.find(p => p.id === 'preset-social-chat');
    expect(social).toBeDefined();
    expect(social!.css).toContain('::before');
    expect(social!.css).toContain('border-top-color');
  });

  it('all presets have id, name, css fields', () => {
    DEFAULT_CSS_PACKAGES.forEach(pkg => {
      expect(pkg.id).toBeTruthy();
      expect(pkg.name).toBeTruthy();
      expect(pkg.css).toBeTruthy();
    });
  });

  it('preset names have no English parenthetical annotations', () => {
    DEFAULT_CSS_PACKAGES.forEach(pkg => {
      expect(pkg.name).not.toMatch(/\(.*\)/);
    });
  });
});

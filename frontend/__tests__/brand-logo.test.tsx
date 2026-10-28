import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrandLogo } from '../components/ui/BrandLogo';

describe('Deep Module: BrandLogo Component', () => {
  it('renders default full variant with transparent logo and link', () => {
    render(<BrandLogo />);
    const link = screen.getByRole('link', {
      name: /OPTRIP - Nền tảng quản trị và điều hành tour lữ hành/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');

    const image = screen.getByAltText('OPTRIP - Travel Operations Platform');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('/brand/optrip-logo-transparent.png');
    expect(image).toHaveAttribute('width', '114');
    expect(image).toHaveAttribute('height', '38');
  });

  it('renders mark variant with 1:1 aspect ratio square dimensions', () => {
    render(<BrandLogo variant="mark" size="sm" asLink={false} />);
    const image = screen.getByAltText('OPTRIP App Icon');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('/brand/optrip-mark.png');
    expect(image).toHaveAttribute('width', '30');
    expect(image).toHaveAttribute('height', '30');
  });

  it('renders responsive variant with mobile mark and desktop full logo', () => {
    render(<BrandLogo variant="responsive" size="md" />);
    const markImg = screen.getByAltText('OPTRIP App Icon');
    const fullImg = screen.getByAltText('OPTRIP - Travel Operations Platform');

    expect(markImg).toBeInTheDocument();
    expect(fullImg).toBeInTheDocument();
    expect(markImg.parentElement).toHaveClass('block sm:hidden');
    expect(fullImg.parentElement).toHaveClass('hidden sm:block');
  });

  it('renders dark theme with pure transparent white-text logo without white card', () => {
    render(<BrandLogo theme="dark" size="lg" asLink={false} />);
    const image = screen.getByAltText('OPTRIP - Travel Operations Platform');
    expect(image).toBeInTheDocument();
    expect(image.getAttribute('src')).toContain('/brand/optrip-logo-dark.png');
  });

  it('renders brand-bar variant with mark and vector typography for enterprise sidebars', () => {
    render(<BrandLogo variant="brand-bar" theme="dark" asLink={false} />);
    const markImg = screen.getByAltText('OPTRIP');
    expect(markImg).toBeInTheDocument();
    expect(screen.getByText('OPTRIP')).toBeInTheDocument();
    expect(screen.getByText('ERP')).toBeInTheDocument();
  });

  it('supports custom href and size xl for auth/login pages', () => {
    render(<BrandLogo size="xl" href="/login" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/login');

    const image = screen.getByAltText('OPTRIP - Travel Operations Platform');
    expect(image).toHaveAttribute('width', '180');
    expect(image).toHaveAttribute('height', '60');
  });
});

type ShopLogoProps = {
  className?: string
}

export function ShopLogo({ className }: ShopLogoProps) {
  return (
    <span className={className ? `shop-logo__brand ${className}` : 'shop-logo__brand'}>
      <svg
        className="shop-logo__mark"
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="4"
          y="10"
          width="24"
          height="18"
          rx="5"
          fill="currentColor"
          className="shop-logo__mark-body"
        />
        <path
          d="M11 10c0-3.314 2.686-6 6-6s6 2.686 6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="shop-logo__mark-handle"
        />
        <path
          d="M11.5 17.5h9"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
      <span className="shop-logo__text">
        <span className="shop-logo__shop">Shop</span>
        <span className="shop-logo__top">Top</span>
      </span>
    </span>
  )
}

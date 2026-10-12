import React from "react";

// ECMS logo: house + heart mark with wordmark. `light` is for dark backgrounds.
function Brand({ light = false, compact = false }) {
  return (
    <span className={"ecms-brand" + (light ? " ecms-brand--light" : "")}>
      <svg
        className="ecms-brand__mark"
        viewBox="0 0 40 40"
        aria-hidden="true"
        focusable="false"
      >
        <rect width="40" height="40" rx="11" fill="#0f8f8a" />
        <path
          d="M10.5 19.6 20 11.8l9.5 7.8v9.2a1.7 1.7 0 0 1-1.7 1.7H12.2a1.7 1.7 0 0 1-1.7-1.7z"
          fill="none"
          stroke="#fff"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d="M20 27.4s-4.3-2.6-4.3-5.5a2.2 2.2 0 0 1 4.3-.9 2.2 2.2 0 0 1 4.3.9c0 2.9-4.3 5.5-4.3 5.5z"
          fill="#f2b44c"
        />
      </svg>
      <span className="ecms-brand__text">
        <span className="ecms-brand__name">ECMS</span>
        {!compact && (
          <span className="ecms-brand__tag">Elderly Care Management</span>
        )}
      </span>
    </span>
  );
}

export default Brand;

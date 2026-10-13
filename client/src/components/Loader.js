import React, { useEffect, useState } from "react";
import { BrandMark } from "components/Brand.js";

// Full-screen loading state: the ECMS mark with a beating heart.
// `note` replaces the label if loading takes longer than `noteAfter` ms.
function Loader({ label = "Loading…", note, noteAfter = 4000 }) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!note) return undefined;
    const t = setTimeout(() => setLate(true), noteAfter);
    return () => clearTimeout(t);
  }, [note, noteAfter]);

  return (
    <div className="ecms-loader" role="status" aria-live="polite">
      <span className="ecms-loader__mark">
        <BrandMark className="ecms-beat" />
      </span>
      <p>{late ? note : label}</p>
    </div>
  );
}

export default Loader;

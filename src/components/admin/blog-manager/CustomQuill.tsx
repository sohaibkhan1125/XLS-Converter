
"use client";
import React, { forwardRef } from "react";
import dynamic from "next/dynamic";

// It's good practice to ensure react-quill styles are loaded.
// If they are already loaded globally or in the form component, this might be redundant.
// However, user's original blog-post-form.tsx already imports this.
// import 'react-quill/dist/quill.snow.css'; 

// For props typing, ReactQuillProps would be ideal.
// Using 'any' as per user's example structure.
import type { ReactQuillProps } from 'react-quill';

const ReactQuill = dynamic(
  async () => {
    // ReactQuill is often a default export
    const mod = await import("react-quill");
    return mod.default;
  },
  { ssr: false }
);

// The 'ref' here is the ref passed to CustomQuill from its parent.
// It's being passed as a prop named 'forwardedRef' to ReactQuill, as per user's request.
const CustomQuill = forwardRef<any, ReactQuillProps>((props: any, ref) => (
  // This outer div is part of the user's specified structure.
  // The ref from forwardRef is NOT attached to this div in this specific user example.
  // Any className passed to CustomQuill will be spread to ReactQuill via {...props}.
  <div>
    <ReactQuill {...props} forwardedRef={ref} />
  </div>
));

CustomQuill.displayName = "CustomQuill";

export default CustomQuill;

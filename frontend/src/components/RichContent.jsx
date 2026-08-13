"use client";

export const RichContent = ({ html, className = "" }) => (
  <div
    className={`bnb-prose ${className}`}
    data-testid="rich-content"
    dangerouslySetInnerHTML={{ __html: html || "" }}
  />
);

export default RichContent;

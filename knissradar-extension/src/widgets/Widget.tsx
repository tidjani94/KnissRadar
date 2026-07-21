import React from "react";
import { FAB } from "./FAB";
import { Panel } from "./Panel";
import { EVENT_NAME } from "../shared/interceptor";
import type { ExtractedListing } from "../shared/types";

export function Widget(): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  const [listing, setListing] = React.useState<ExtractedListing | null>(null);

  React.useEffect(() => {
    function handleListingData(event: CustomEvent<ExtractedListing>): void {
      setListing(event.detail);
    }

    window.addEventListener(EVENT_NAME, handleListingData as EventListener);
    return () => {
      window.removeEventListener(
        EVENT_NAME,
        handleListingData as EventListener
      );
    };
  }, []);

  return (
    <div
      className="fixed z-[2147483647]"
      style={{
        right: 0,
        top: expanded ? 0 : "auto",
        bottom: expanded ? "auto" : 0,
        height: expanded ? "100vh" : "auto",
      }}
    >
      {expanded ? (
        <Panel listing={listing} onClose={() => setExpanded(false)} />
      ) : (
        <div className="fixed bottom-3 right-3">
          <FAB onClick={() => setExpanded(true)} />
        </div>
      )}
    </div>
  );
}

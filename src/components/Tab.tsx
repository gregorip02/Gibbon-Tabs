import React from "react";
import fuse from "fuse.js";
import HighlightedText from "./HighlightedText";

interface Tab {
  title: string;
  url: string;
  iconUrl: string | undefined;
  active: boolean;
  windowId: number;
  tabId: number;
  highlightMatches?: readonly fuse.FuseResultMatch[];
}

export default function Tab({
  title,
  url,
  iconUrl,
  active,
  windowId,
  tabId,
  highlightMatches = [],
}: Tab): React.ReactElement {
  let activateTab: () => void = () => {
    (window as any)["chrome"].windows.update(windowId, { focused: true });
    (window as any)["chrome"].tabs.update(tabId, {
      active: true,
      highlighted: true,
    });
  };

  let titleHighlightMatches = highlightMatches.filter(
    (match) => match.key === "title"
  );

  let urlHighlightMatches = highlightMatches.filter(
    (match) => match.key === "url"
  );

  return (
    <div
      onClick={activateTab}
      className="pt-4 pb-4 pl-1 pr-1 m-1 mb-2 text-white bg-gray-800 flex flex-row"
    >
      <div className="flex flex-col pl-2 pr-2 justify-center w-8">
        {iconUrl ? (
          <img className="object-contain max-w-none" src={iconUrl}></img>
        ) : null}
      </div>
      <div className="flex-grow overflow-hidden">
        <div className="text-sm truncate">
          <HighlightedText
            text={title}
            highlightMatches={titleHighlightMatches}
          ></HighlightedText>
        </div>
        <div className="text-xs truncate">
          <HighlightedText
            text={url}
            highlightMatches={urlHighlightMatches}
          ></HighlightedText>
        </div>
      </div>
    </div>
  );
}

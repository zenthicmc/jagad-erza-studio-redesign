import { Node, mergeAttributes, CommandProps } from "@tiptap/core";
import { DOMOutputSpec } from "@tiptap/pm/model";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { CustomImageNodeView } from "./custom-image-node-view";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    customImage: {
      setCustomImage: (options: {
        src: string;
        alt?: string;
        sourceName?: string;
        sourceUrl?: string;
        captionAlign?: string;
      }) => ReturnType;
    };
  }
}

export const CustomImageExtension = Node.create({
  name: "customImage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addNodeView() {
    return ReactNodeViewRenderer(CustomImageNodeView);
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector("img");
          return img?.getAttribute("src") || null;
        },
      },
      alt: {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector("img");
          return img?.getAttribute("alt") || null;
        },
      },
      "data-source-name": {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector("img");
          return img?.getAttribute("data-source-name") || null;
        },
      },
      "data-source-url": {
        default: null,
        parseHTML: (element) => {
          const img = element.querySelector("img");
          return img?.getAttribute("data-source-url") || null;
        },
      },
      "caption-align": {
        default: "left",
        parseHTML: (element) => {
          return element.getAttribute("data-caption-align") || "left";
        },
      },
      align: {
        default: "left",
        parseHTML: (element) => {
          return element.getAttribute("data-align") || "left";
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.style.width;
          return width ? parseInt(width) : null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure.image-with-source",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const {
      src,
      alt,
      "data-source-name": sourceName,
      "data-source-url": sourceUrl,
      "caption-align": captionAlign,
      align: figureAlign,
      width,
    } = HTMLAttributes;

    const hasSources = sourceName || sourceUrl;
    const align = captionAlign || "left";
    const imageAlign = figureAlign || "left";

    const figureAttrs: Record<string, string> = {
      class: "image-with-source",
      "data-drag-handle": "",
      "data-caption-align": align,
      "data-align": imageAlign,
    };

    let figureStyle = "";
    if (width) {
      figureStyle += `width: ${width}px; `;
    }

    if (imageAlign === "center") {
      figureStyle += "margin-left: auto; margin-right: auto; ";
    } else if (imageAlign === "right") {
      figureStyle += "margin-left: auto; margin-right: 0; ";
    } else {
      figureStyle += "margin-left: 0; margin-right: auto; ";
    }

    if (figureStyle) {
      figureAttrs.style = figureStyle.trim();
    }

    let imgStyle = "";
    if (imageAlign === "center") {
      imgStyle = "display: block; margin-left: auto; margin-right: auto;";
    } else if (imageAlign === "right") {
      imgStyle = "display: block; margin-left: auto; margin-right: 0;";
    } else {
      imgStyle = "display: block; margin-left: 0; margin-right: auto;";
    }

    const elements: (
      | string
      | Record<string, string>
      | (string | Record<string, string>)[]
      | (string | Record<string, string | undefined>)[]
    )[] = [
      "figure",
      figureAttrs,
      [
        "img",
        mergeAttributes({
          src,
          alt: alt || sourceName || "Article image",
          "data-source-name": sourceName || "",
          "data-source-url": sourceUrl || "",
          style: imgStyle,
        }),
      ],
    ];

    if (hasSources) {
      elements.push([
        "figcaption",
        {
          contenteditable: "false",
          style: `text-align: ${align}`,
        },
        "Source: ",
        [
          "a",
          {
            href: sourceUrl || "#",
            target: "_blank",
            rel: "noopener noreferrer",
            class: "source-link",
          },
          sourceName || "Unknown",
        ],
      ] as (string | Record<string, string>)[]);
    }

    return elements as unknown as DOMOutputSpec;
  },

  addCommands() {
    return {
      setCustomImage:
        (options: {
          src: string;
          alt?: string;
          sourceName?: string;
          sourceUrl?: string;
          captionAlign?: string;
        }) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt,
              "data-source-name": options.sourceName,
              "data-source-url": options.sourceUrl,
              "caption-align": options.captionAlign || "left",
            },
          });
        },
    };
  },
});

// tina/config.ts
import { defineConfig } from "tinacms";
var branch = "main";
var config_default = defineConfig({
  branch,
  // Get this from tina.io
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  // Get this from tina.io
  token: process.env.TINA_TOKEN,
  build: {
    outputFolder: "admin",
    publicFolder: "public"
  },
  media: {
    tina: {
      mediaRoot: "",
      publicFolder: "public"
    }
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/schema/
  schema: {
    collections: [
      {
        name: "homepage",
        label: "Homepage",
        path: "content/homepage",
        format: "json",
        ui: {
          allowedActions: {
            create: false,
            delete: false
          }
        },
        fields: [
          {
            type: "object",
            name: "hero",
            label: "Hero Section",
            fields: [
              {
                type: "string",
                name: "title",
                label: "Title",
                required: true
              },
              {
                type: "string",
                name: "subtitle",
                label: "Subtitle",
                required: true
              },
              {
                type: "string",
                name: "releaseDate",
                label: "Release Date Text"
              }
            ]
          },
          {
            type: "object",
            name: "summary",
            label: "Book Summary Section",
            fields: [
              {
                type: "string",
                name: "heading",
                label: "Heading",
                required: true
              },
              {
                type: "string",
                name: "paragraph1",
                label: "First Paragraph",
                ui: {
                  component: "textarea"
                }
              },
              {
                type: "string",
                name: "paragraph2",
                label: "Second Paragraph",
                ui: {
                  component: "textarea"
                }
              },
              {
                type: "string",
                name: "keyThemesHeading",
                label: "Key Themes Heading"
              },
              {
                type: "string",
                name: "themes",
                label: "Key Themes",
                list: true
              }
            ]
          },
          {
            type: "object",
            name: "author",
            label: "About the Author Section",
            fields: [
              {
                type: "string",
                name: "heading",
                label: "Heading",
                required: true
              },
              {
                type: "string",
                name: "bio1",
                label: "Bio Paragraph 1",
                ui: {
                  component: "textarea"
                }
              },
              {
                type: "string",
                name: "bio2",
                label: "Bio Paragraph 2",
                ui: {
                  component: "textarea"
                }
              },
              {
                type: "string",
                name: "bio3",
                label: "Bio Paragraph 3",
                ui: {
                  component: "textarea"
                }
              }
            ]
          },
          {
            type: "object",
            name: "newsletter",
            label: "Newsletter Section",
            fields: [
              {
                type: "string",
                name: "heading",
                label: "Heading",
                required: true
              },
              {
                type: "string",
                name: "text",
                label: "Description Text"
              },
              {
                type: "string",
                name: "buttonText",
                label: "Button Text"
              }
            ]
          }
        ]
      }
    ]
  }
});
export {
  config_default as default
};

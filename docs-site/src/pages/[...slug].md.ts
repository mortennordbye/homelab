// Every page as plain Markdown at <page>.md, for agents and the "Copy page" button.
import type { APIRoute, GetStaticPaths } from "astro";
import { absolute, pages } from "../llms";

export const getStaticPaths: GetStaticPaths = async () =>
  (await pages()).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));

export const GET: APIRoute = ({ props }) => {
  const { entry } = props as { entry: Awaited<ReturnType<typeof pages>>[number] };
  return new Response(`# ${entry.data.title}\n\n${absolute(entry.body ?? "").trimStart()}`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};

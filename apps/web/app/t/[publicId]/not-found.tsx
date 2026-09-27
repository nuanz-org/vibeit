import { PublicToolMessage } from "@/features/public-tool/components/public-tool-state";

export default function PublicToolNotFound() {
  return (
    <PublicToolMessage
      eyebrow="404"
      title="Tool not found."
      body="This public link is invalid, or the tool isn’t published."
    />
  );
}

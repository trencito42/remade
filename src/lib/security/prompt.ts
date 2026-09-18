export function wrapUntrustedSource(input: {
  id: string;
  name: string;
  tier: number;
  title: string;
  relationship: string;
  content: string;
}): string {
  const sanitized = input.content
    .replace(/<system>[\s\S]*?<\/system>/gi, "")
    .replace(/<instructions>[\s\S]*?<\/instructions>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .trim();

  return `[BEGIN UNTRUSTED THIRD-PARTY CONTENT]
Source ID: ${input.id}
Outlet: ${input.name} (Tier ${input.tier}, Relationship: ${input.relationship})
Headline: ${input.title}
Body:
${sanitized}
[END UNTRUSTED THIRD-PARTY CONTENT]`;
}

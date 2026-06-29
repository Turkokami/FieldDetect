export const DEFAULT_CONTRACT_TEMPLATE = `{{company_name}} — Canine Bed Bug Detection Service Agreement

This agreement is entered into between {{company_name}} ("Company") and the Customer for the purpose of providing Canine Bed Bug Detection services within the State of {{state}}.

SERVICE DESCRIPTION
{{company_name}} will provide trained canine bed bug detection services at the property identified by the Customer. The Company will provide all required personnel and equipment. A written report of canine alerts and visual inspection findings will be provided following the inspection. If a canine alert cannot be visually confirmed by the handler, the alert will still be documented for the Customer's consideration.

CANINE DETECTION
{{company_name}}'s detection dogs are professionally trained to detect the odor of live bed bugs. Daily training and quality assurance procedures are used to maintain detection reliability.

LIMITATIONS
No inspection method is 100% accurate. {{company_name}} does not guarantee that every bed bug will be detected or that a property is free from infestation. The Customer understands that canine inspection is one component of an integrated inspection process.

CUSTOMER PREPARATION
The Customer agrees to complete all required preparation instructions before the scheduled inspection. Failure to properly prepare the property may reduce inspection effectiveness.

CANCELLATION
Inspections cancelled with less than seventy-two (72) hours' notice may be subject to a $250 cancellation fee.

GOVERNING LAW
This Agreement shall be governed by the laws of the State of {{state}}.

PAYMENT AUTHORIZATION
The Customer authorizes payment by approved payment method for services performed under this Agreement.

NOTICE OF CANCELLATION
The buyer may cancel this transaction before midnight of the third business day following execution of this Agreement where required by applicable law.

{{company_name}} maintains all licenses and insurance required under applicable law.`;

export const CONTRACT_VARIABLES = [
  { key: "{{company_name}}", description: "Your business name" },
  { key: "{{state}}", description: "Your operating state" },
] as const;

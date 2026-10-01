# n8n-nodes-connectuc

This is an n8n community node. It lets you use [ConnectUC](https://www.skyswitch.com/) in your n8n workflows.

ConnectUC is SkySwitch's unified communications platform: business phone calls, voicemail, SMS, contacts, and call records for PBX users. This package gives you a **ConnectUC** node to act on those (send SMS, start calls, manage contacts and call records) and a **ConnectUC Trigger** node that starts workflows when calls, voicemails, recordings, transcriptions, or SMS messages happen.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In short: in n8n go to **Settings → Community Nodes → Install**, and enter `n8n-nodes-connectuc`.

## Operations

### ConnectUC node

| Resource | Operation | What it does |
|---|---|---|
| Call | Initiate | Click-to-call: rings one of the user's registered devices and, once answered, dials the destination. Optional caller ID. |
| CDR | Find | Finds a call detail record by its originating or terminating call ID. |
| CDR | Update | Adds a note, and optionally a disposition and reason, to a call detail record. |
| Contact | Create | Creates a contact in a user's address book: name, phones with types, email, company, title, tags. |
| SMS | Send | Sends an SMS, or an MMS with media URLs, from one of your SMS numbers. |
| User | Set Do Not Disturb | Turns Do Not Disturb on or off for a user. |

### ConnectUC Trigger node

| Event | Fires when |
|---|---|
| New Call Summary | An AI call summary is ready |
| New Call Transcription | A call transcription is ready |
| New CDR | A call detail record is created (after a call ends) |
| New Incoming Call | A call comes in. Filter by **Status**: Answered (default), Ringing, or Both. |
| New Outgoing Call | A call is placed |
| New Recording | A call recording is ready |
| New SMS | An SMS is received or sent. Filter by **Recipients** (required) and **Direction**. |
| New Voicemail | A voicemail is left |

Every event is filtered by **Domain** and **Users**. Pick specific users, or **All Users** for everyone in the domain.

## Credentials

The nodes authenticate with **OAuth2** through ConnectUC's identity provider (FusionAuth).

### Prerequisites

- A ConnectUC (SkySwitch) account with PBX access.
- An **n8n OAuth client** for your organization. Resellers get one from the SkySwitch reseller portal. It provides a **Client ID** and **Client Secret**, and you must register your n8n instance's redirect URL on it (see below).

### Setup

1. In n8n, go to **Credentials → Create credential → ConnectUC OAuth2 API**.
2. Copy the **OAuth Redirect URL** shown in the credential, for example `https://your-n8n.example.com/rest/oauth2-credential/callback`. Register it on your n8n OAuth client in the reseller portal. It must match **exactly**, including `https` and the path.
3. Paste your **Client ID** and **Client Secret**.
4. Leave **Base URL** as `https://api.connectuc.io` unless SkySwitch tells you otherwise.
5. Click **Connect my account** and sign in.

> **Sign in with your PBX (ConnectUC) login**, for example `101@yourcompany`, **not** a corporate single sign-on button. The PBX login carries your phone system identity and role. A token from another identity can list domains but is refused with *"cannot act on this user"* on user actions such as Do Not Disturb, contacts, and calls. If your browser is already signed in to another identity, connect from a private or incognito window.

What you can do depends on your PBX role:

- **Resellers** can work with every domain and user in their territory.
- **Office managers** can work with users in their own domain.
- **Other users** can act only on themselves, for example only their own devices, contacts, and trigger events.

## Compatibility

- Tested with n8n **2.41.5** (self-hosted).
- Requires an n8n version that supports community nodes with `n8nNodesApiVersion: 1`.
- No runtime dependencies.

## Usage

### Tips and gotchas

- **SMS recipients** must be US numbers. Any common format works (`(561) 555-0100`, `+1 561-555-0100`, `15615550100`). The node normalizes them to `1XXXXXXXXXX` and rejects anything else before sending.
- **Several SMS recipients create one group conversation**, not separate messages. To text people individually, send one item per recipient.
- **Leave SMS Sender empty** to send from the user's default SMS number.
- **The Device dropdown** in *Call → Initiate* lists only devices that are registered right now. Open the ConnectUC app or bring the phone online first.
- **CDR → Update takes the CDR `id`** returned by *CDR → Find*, not the call ID. Chain them with `{{ $json.id }}`.
- **A CDR can take a few seconds to appear** after a call ends.
- **New Incoming Call with Status = Both** fires twice for an answered call: once when it rings and once when it's answered.
- **New SMS needs at least one Recipient**. Without one, no messages are delivered.
- **Test mode:** *Listen for test event* waits for a **real** event, so make a call or send a text within about two minutes. To build a workflow without live events, pin one of the sample payloads below on the trigger (**Edit Output → Pin**).

### Example workflows

**Log every answered call in a spreadsheet**
ConnectUC Trigger (*New Incoming Call*, Status *Answered*) → Google Sheets (*Append row* with `callerId`, `callerName`, `timeStart`).

**Text back missed callers**
ConnectUC Trigger (*New Voicemail*) → ConnectUC (*SMS → Send*, Recipients `{{ $json.tel }}`, Message "Sorry we missed you, we'll call back shortly.").

**Add call notes from your CRM**
Your CRM trigger → ConnectUC (*CDR → Find*, Call ID from the CRM) → ConnectUC (*CDR → Update*, CDR ID `{{ $json.id }}`, Note from the CRM).

### Sample trigger payloads

Shapes of what each event delivers. The values are illustrative.

<details>
<summary>New Incoming Call / New Outgoing Call</summary>

```json
{
	"origCallid": "cb4542b9-34ff-123f-9192-005056842248",
	"termCallid": "20251105153444016549-7e6c15a2661d06d7d0281ecd502b4679",
	"callerId": "15615550100",
	"callerName": "Jane Doe",
	"timeStart": "2025-11-05T15:34:44.000Z",
	"to": "101",
	"termToUri": "sip:101w@example.12345.service",
	"from": "15615550100",
	"status": "answered"
}
```

`status` (`ringing` or `answered`) is present on incoming calls only.

</details>

<details>
<summary>New CDR</summary>

```json
{
	"id": "17624380791dba1cd5a13fcb8b4c6b66094f564b0f",
	"dateTime": "2025-11-06T14:07:59.000Z",
	"duration": 8,
	"direction": "outgoing",
	"fromLabel": "Example Co",
	"fromNumber": "15615550100",
	"toLabel": "5615550199",
	"toNumber": "5615550199",
	"origCallid": "8c0spnvbfr8gltgqfseo",
	"termCallid": "20251106140759036333-7e6c15a2661d06d7d0281ecd502b4679",
	"missed": false,
	"contactId": null,
	"recordingId": null,
	"recordingType": null,
	"voicemailId": null,
	"disposition": null,
	"reason": null,
	"onnet": 0
}
```

</details>

<details>
<summary>New Recording</summary>

```json
{
	"dateTime": "2025-11-06T14:07:59.000Z",
	"duration": "20",
	"unread": true,
	"origCallid": "8c0spnvbfr8gltgqfseo",
	"recordingId": "eyJ0ZXJtQ2FsbGlkIjoiOGMwc3BudmJmcjhnbHRncWZzZW8iLCJvcmlnQ2FsbGlkIjoiOGMwc3BudmJmcjhnbHRncWZzZW8ifQ==",
	"recordingType": "audio",
	"mediaUrl": "https://api.connectuc.io/users/<user-uuid>/recordings/<recording-id>/url",
	"download_url": "https://api.connectuc.io/users/<user-uuid>/recordings/<recording-id>/url",
	"domain": "example.12345.service",
	"user": "101"
}
```

</details>

<details>
<summary>New Voicemail</summary>

```json
{
	"id": "vm-20251106141508017931-7e6c15a2661d06d7d0281ecd502b4679",
	"dateTime": "2025-11-06T14:15:37.000000Z",
	"duration": 6,
	"label": "(561) 555-0100",
	"tel": "15615550100",
	"read": false,
	"transcription": null,
	"filename": "vm-20251106141508017931-7e6c15a2661d06d7d0281ecd502b4679.wav",
	"type": "vmail/new",
	"contactId": null,
	"forwarded": null,
	"shared_uuid": null
}
```

</details>

<details>
<summary>New Call Transcription</summary>

```json
{
	"id": "202602-760134328",
	"cdrId": "1771251913ef8e5c02029348132eb7853dd1b154aa",
	"callId": "l2e57o5cj0tlgpbrafjc",
	"orig_sub": "102",
	"orig_domain": "example.12345.service",
	"term_sub": "101",
	"term_domain": "example.12345.service",
	"status": "finished",
	"summary": null,
	"comments": [
		{
			"speaker": "Jane Doe",
			"comment": "Hi, thanks for calling.",
			"startTime": "00:00:00,79",
			"endTime": "00:00:02,32",
			"created": "2026-02-17T00:44:17.000000Z"
		}
	]
}
```

</details>

<details>
<summary>New Call Summary</summary>

```json
{
	"callId": "233dbsj3mssskjkk22",
	"summary": "Customer asked to reschedule the installation to next Tuesday.",
	"date": "2026-04-01"
}
```

</details>

<details>
<summary>New SMS</summary>

```json
{
	"conversationId": 6162954,
	"messageId": "i781083318",
	"referenceId": "019589D026548F368BB25AC2D4",
	"type": "message",
	"direction": "incoming",
	"sender": "15615550100",
	"recipients": ["15615550199"],
	"content": "Is my appointment still on for tomorrow?",
	"contentType": "text/plain",
	"createdTimestamp": "2025-12-04T14:48:55.000Z",
	"media": []
}
```

</details>

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [SkySwitch](https://www.skyswitch.com/)
- [Issues and source code](https://github.com/SkySwitch/n8n-nodes-connectuc)

## Version history

### 0.1.0

Initial release: the ConnectUC node (Call, CDR, Contact, SMS, User) and the ConnectUC Trigger node (8 events), with OAuth2 authentication.

import { CheckCheckIcon, CheckIcon } from "lucide-react";
import { MessageStatus } from "stream-chat-react";

const SentTick = () => (
  <span title="Sent">
    <CheckIcon className="wa-tick" size={14} aria-hidden="true" />
  </span>
);
const DeliveredTick = () => (
  <span title="Delivered">
    <CheckCheckIcon className="wa-tick" size={14} aria-hidden="true" />
  </span>
);
const ReadTick = () => (
  <span title="Read">
    <CheckCheckIcon className="wa-tick wa-tick--read" size={14} aria-hidden="true" />
  </span>
);

const WhatsAppMessageStatus = (props) => (
  <MessageStatus
    {...props}
    MessageSentStatus={SentTick}
    MessageDeliveredStatus={DeliveredTick}
    MessageReadStatus={ReadTick}
  />
);

export default WhatsAppMessageStatus;

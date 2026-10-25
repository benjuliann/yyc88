// Covers the screen with a prompt while the phone is held the wrong way (see controller.css).
export default function RotatePhone({ to }: { to: "portrait" | "landscape" }) {
  return (
    <div className={`rotate-phone rotate-phone--${to}`}>
      <span className="rotate-phone__icon">⟳</span>
      <p className="controller__message">
        {to === "portrait" ? "Turn your phone upright" : "Turn your phone sideways"}
      </p>
    </div>
  );
}

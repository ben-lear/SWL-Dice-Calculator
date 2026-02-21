interface CollapseChevronProps {
  isExpanded: boolean;
}

export function CollapseChevron({ isExpanded }: CollapseChevronProps) {
  return (
    <span
      className={`text-gray-500 transition-transform duration-200 ${
        isExpanded ? 'rotate-0' : '-rotate-90'
      }`}
      aria-hidden="true"
    >
      ▾
    </span>
  );
}

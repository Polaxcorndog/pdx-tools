import React from "react";
import { Button, ButtonProps } from "./Button";
import { Tooltip } from "./Tooltip";

type IconButtonProps = ButtonProps & {
  tooltip: string;
  side?: React.ComponentPropsWithoutRef<typeof Tooltip.Content>["side"];
  icon: React.ReactNode;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ tooltip, icon, side = "top", ...rest }, ref) {
    return (
      <Tooltip>
        <Tooltip.Trigger asChild>
          <Button ref={ref} {...rest}>
            {icon}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content side={side} className="max-w-xs">
          {tooltip}
        </Tooltip.Content>
      </Tooltip>
    );
  },
);

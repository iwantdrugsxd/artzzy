import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import Pill from "./Pill";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

const Chip: React.FC<Props> = ({ label, selected, onPress, icon, style }) => {
  return (
    <Pill
      label={label}
      selected={selected}
      onPress={onPress}
      icon={icon}
      style={style}
    />
  );
};

export default Chip;

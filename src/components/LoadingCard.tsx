import React from "react";
import { StyleSheet, View } from "react-native";
import { layout, radius } from "../theme";
import Card from "./Card";
import Skeleton from "./Skeleton";

const LoadingCard: React.FC = () => {
  return (
    <Card style={styles.card} padding="lg">
      <Skeleton height={220} radius={radius.card} />
      <View style={styles.textBlock}>
        <Skeleton height={16} radius={10} />
        <Skeleton height={12} width="70%" radius={10} style={styles.shortLine} />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 360,
  },
  textBlock: {
    marginTop: layout.section,
    gap: layout.compact,
  },
  shortLine: {
    marginTop: layout.compact,
  },
});

export default LoadingCard;

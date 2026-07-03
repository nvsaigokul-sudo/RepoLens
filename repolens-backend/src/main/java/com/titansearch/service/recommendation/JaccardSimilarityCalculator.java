package com.titansearch.service.recommendation;

import java.util.HashSet;
import java.util.Set;

public class JaccardSimilarityCalculator {

    /**
     * Calculates Jaccard similarity score between two string sets: J(A, B) = |A ∩ B| / |A ∪ B|
     */
    public static double calculate(Set<String> setA, Set<String> setB) {
        if (setA == null || setB == null || setA.isEmpty() || setB.isEmpty()) {
            return 0.0;
        }

        Set<String> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);

        Set<String> union = new HashSet<>(setA);
        union.addAll(setB);

        return (double) intersection.size() / (double) union.size();
    }
}

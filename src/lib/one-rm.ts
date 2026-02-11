/**
 * 1RM (One Rep Max) calculation utilities
 * Implements three common formulas: Epley, Brzycki, and Lombardi
 */

export interface OneRMResult {
    min: number;
    max: number;
    avg: number;
}

/**
 * Epley Formula: weight × (1 + reps/30)
 * Good for higher rep ranges (4-10 reps)
 */
export function calculateEpley(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * (1 + reps / 30);
}

/**
 * Brzycki Formula: weight × (36 / (37 - reps))
 * Considered most accurate for 2-10 reps
 */
export function calculateBrzycki(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps >= 37) return weight; // Formula breaks down at high reps
    return weight * (36 / (37 - reps));
}

/**
 * Lombardi Formula: weight × reps^0.10
 * Conservative estimate, works across rep ranges
 */
export function calculateLombardi(weight: number, reps: number): number {
    if (reps === 1) return weight;
    return weight * Math.pow(reps, 0.1);
}

/**
 * Calculate 1RM using all three formulas and return min, max, and average
 */
export function calculate1RMRange(
    weight: number,
    reps: number
): OneRMResult {
    const epley = calculateEpley(weight, reps);
    const brzycki = calculateBrzycki(weight, reps);
    const lombardi = calculateLombardi(weight, reps);

    const values = [epley, brzycki, lombardi];
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Round down to nearest 0.5
    const roundedAvg = Math.floor(avg * 2) / 2;

    return {
        min: roundedAvg, // Keeping interface consistent for now, but values are same
        max: roundedAvg,
        avg: roundedAvg,
    };
}

/**
 * Set data structure from database
 */
export interface WorkoutSet {
    id: string;
    end_time: string;
    start_time: string;
    workout_title: string;
    weight_kg: number | null;
    reps: number | null;
    set_type: string;
    rpe: number | null;
}

/**
 * Processed data point for charting
 */
export interface ChartDataPoint {
    date: Date;
    weight: number;
    reps: number;
    oneRM: OneRMResult;
    isHeavySet: boolean; // reps <= 3
    workoutTitle: string;
}

/**
 * Group sets by workout session (workout_title + date)
 */
export function groupSetsByWorkout(sets: WorkoutSet[]): Map<string, WorkoutSet[]> {
    const grouped = new Map<string, WorkoutSet[]>();

    for (const set of sets) {
        const date = new Date(set.end_time).toISOString().split('T')[0]; // YYYY-MM-DD
        const key = `${set.workout_title}_${date}`;

        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key)!.push(set);
    }

    return grouped;
}

/**
 * Find maximum weight per workout session
 */
export interface MaxWeightPoint {
    date: Date;
    weight: number;
    workoutTitle: string;
}

export function findMaxWeightPerWorkout(sets: WorkoutSet[]): MaxWeightPoint[] {
    const grouped = groupSetsByWorkout(sets);
    const maxPoints: MaxWeightPoint[] = [];

    for (const [, workoutSets] of grouped) {
        let maxWeight = 0;
        let maxDate: Date | null = null;
        let workoutTitle = '';

        for (const set of workoutSets) {
            if (set.weight_kg && set.weight_kg > maxWeight) {
                maxWeight = set.weight_kg;
                maxDate = new Date(set.end_time);
                workoutTitle = set.workout_title;
            }
        }

        if (maxDate && maxWeight > 0) {
            maxPoints.push({
                date: maxDate,
                weight: maxWeight,
                workoutTitle,
            });
        }
    }

    // Sort by date
    return maxPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Process sets into chart data points with 1RM calculations
 */
export function processSetDataForChart(sets: WorkoutSet[]): ChartDataPoint[] {
    const dataPoints: ChartDataPoint[] = [];

    for (const set of sets) {
        // Skip sets without weight or reps
        if (!set.weight_kg || !set.reps) continue;

        // Only process normal sets
        if (set.set_type !== 'normal') continue;

        const oneRM = calculate1RMRange(set.weight_kg, set.reps);

        dataPoints.push({
            date: new Date(set.end_time),
            weight: set.weight_kg,
            reps: set.reps,
            oneRM,
            isHeavySet: set.reps <= 3,
            workoutTitle: set.workout_title,
        });
    }

    // Sort by date
    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
}


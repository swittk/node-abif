/*
 * Fields relevant to data analysis
 * - DATA.9 - DATA.12 : Vectors containing the signal intensities for each channel.
 * - FWO_.1 : A string containing the base corresponding to each channel. For example, if it is "ACGT", then DATA.9 = A, DATA.10 = C, DATA.11 = G and DATA.12 = T.
 * - PLOC.2 : Peak locations as an index of the trace vectors.
 * - PBAS.1, PBAS.2 : Primary basecalls. PBAS.1 may contain bases edited in the original basecaller, while PBAS.2 always contains the basecaller’s calls.
 * - P1AM.1 : Amplitude of primary basecall peaks
 * - P2BA.1 : (optional) Contains the secondary basecalls.
 * - P2AM.1 : (optional) Amplitude of the secondary basecall peaks.
 * 
 * - RUNT.1 {time} : Run start time
 * - RUNT.2 {time} : Run stop time
 * - RUNT.3 {time} : Data Collection start time
 * - RUNT.4 {time} : Data Collection stop time
 * (Generally RUNT 1&3, 2&4, are equal)
 */
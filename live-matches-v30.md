The Local v30 – Live two-player challenges

Arcade now includes community-shared, turn-based Darts 501 and Pool Race to 8 challenges. One member creates a match; a second member joins it from the same community. Each records a turn, and the other player can view the updated scores on their own device. Supabase's existing posts table is used, so no new SQL setup is required if the existing group posts already work.

IMPORTANT: These are scorekeeping challenges, not synchronized physics games. Pool requires players to play shots in person and enter how many balls they potted. Darts requires players to enter their dart scores; it is not an interactive online dartboard. Darts match scoring is simplified (no complete three-dart visit and bust reset rules). Players must have distinct account names. Matches are friendly, not cheat-resistant, and concurrent moves are not transactionally locked. If you want full online physics pool or graphical darts, that requires a separate multiplayer engine and server validation.

Test with two separate signed-in accounts on two phones, both joined to the same community. Open Arcade, create a match, join with the other account, and record turns. The group feed's Supabase Realtime subscription refreshes the interface when changes arrive. In local demo mode, you can preview the interface, but you cannot truly play across devices.

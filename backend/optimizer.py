import networkx as nx
import math
import itertools
from collections import defaultdict
from chord_data import OPEN_STRINGS, NUM_STRINGS, MAX_FRET

def get_possible_locations(pitch):
    """Returns list of (string_idx, fret) for a midi pitch."""
    locs = []
    for s_idx, open_p in enumerate(OPEN_STRINGS):
        fret = pitch - open_p
        if 0 <= fret <= MAX_FRET:
            locs.append((s_idx, fret))
    return locs

def calculate_static_cost(fingering):
    """
    Calculates the 'static' difficulty of a fingering.
    """
    if not fingering:
        return 0.0

    cost = 20.0 # Base bias
    
    frets = [f for s, f in fingering if f > 0] 
    
    # 1. Span/Stretch Cost
    if frets:
        min_f = min(frets)
        max_f = max(frets)
        span = max_f - min_f
        if span > 4:
            cost += (span - 4) ** 2 * 2.0 # Exponential penalty for wide stretch
    
    # 2. Position Bias (Standard Guitar Logic)
    # Prefer lower frets generally.
    avg_fret = sum(frets) / len(frets) if frets else 0.0
    cost += avg_fret * 0.1 # Gentle gradient up the neck
    
    # 3. Open String Bonus
    num_open = sum(1 for s, f in fingering if f == 0)
    cost -= num_open * 2.0 # Good to use open strings

    return max(1.0, cost)

def calculate_transition_cost(prev_fingering, curr_fingering):
    """
    Calculates cost of moving from prev_fingering to curr_fingering.
    Includes rules for horizontal distance, vertical movement, and finger mechanics.
    """
    if not prev_fingering or not curr_fingering:
        return 0.0
    
    def get_centroid(fg):
        frets = [f for s, f in fg if f > 0]
        strings = [s for s, f in fg]
        if not frets: return (0, 0) # Fallback
        return (sum(frets)/len(frets), sum(strings)/len(strings))

    p_fret, p_str = get_centroid(prev_fingering)
    c_fret, c_str = get_centroid(curr_fingering)
    
    cost = 0.0
    
    # 1. Fret Distance Cost (Horizontal)
    fret_dist = abs(c_fret - p_fret)
    if fret_dist <= 4:
        cost += fret_dist * 0.5 # Low linear cost
    else:
        cost += (fret_dist - 4) ** 2 * 1.0 # Exponential penalty for jumps > 4
        
    # 2. String Distance Cost (Vertical)
    # Moving across many strings is harder
    str_dist = abs(c_str - p_str)
    cost += str_dist * 0.5
    
    # 3. Finger Preference (Biomechanics)
    # "Up the neck" (higher fret) usually goes with "Up the strings" (higher index physically, lower string index)?
    # Wait, simple heuristic:
    # If moving to Higher String Index (physically Down): Fret should Increase or Stay.
    # If moving to Lower String Index (physically Up): Fret should Decrease or Stay.
    # Note: Backend String 0 = Low E (Top of neck physically/thickest). String 5 = High E.
    
    # Moving S0 -> S1 (Higher Index): Fret should Increase?
    # Ex: S0[5] -> S1[7] (Index->Ring). Good.
    # Ex: S0[5] -> S1[3] (Index->Index/Stretch?). Bad.
    
    str_delta = c_str - p_str 
    fret_delta = c_fret - p_fret
    
    if str_delta > 0.5: # Moving to higher strings
        if fret_delta < -1: # Moving back in frets significantly
            cost += 5.0 # Anti-gonomic penalty
            
    if str_delta < -0.5: # Moving to lower strings
        if fret_delta > 1: # Moving up in frets significantly
             cost += 5.0 # Anti-gonomic penalty

    return cost

def generate_fingerings(notes_cluster):
    """Generates all valid fingerings for a chord and calculates their static cost."""
    if not notes_cluster:
        return [([], 0)]

    note_locs = []
    for note in notes_cluster:
        locs = get_possible_locations(note['pitch'])
        if not locs:
            return [] 
        note_locs.append(locs)

    all_combinations = list(itertools.product(*note_locs))
    valid_fingerings = []
    
    for combo in all_combinations:
        # Rule: One note per string
        used_strings = [c[0] for c in combo]
        if len(used_strings) != len(set(used_strings)):
            continue 

        fingering = sorted(list(combo), key=lambda x: x[0])
        cost = calculate_static_cost(fingering)
        valid_fingerings.append((fingering, cost))

    # Pruning for performance
    if len(valid_fingerings) > 40:
         valid_fingerings.sort(key=lambda x: x[1])
         valid_fingerings = valid_fingerings[:40]

    return valid_fingerings

def optimize_fingering(notes):
    """
    Finds the optimal path (sequence of fingerings) that minimizes total cost.
    """
    if not notes:
        return []

    # 1. Cluster notes by time
    clusters = defaultdict(list)
    for note in notes:
        t_quant = round(note['start'] * 20) / 20.0 
        clusters[t_quant].append(note)

    sorted_times = sorted(clusters.keys())
    
    # 2. Build Graph
    G = nx.DiGraph()
    G.add_node("START", time=-1, fingering=[], cost=0)
    
    prev_layer_nodes = ["START"]
    node_mapping = {} 

    for time in sorted_times:
        cluster = clusters[time]
        candidates = generate_fingerings(cluster)
        
        if not candidates:
            continue

        current_layer_nodes = []
        
        for i, (fingering, static_cost) in enumerate(candidates):
            node_id = f"T{time}_V{i}"
            node_mapping[node_id] = fingering
            
            # The node weight itself isn't used by Dijkstra for edges, but useful for debugging
            G.add_node(node_id, time=time, fingering=fingering)
            
            for prev_node in prev_layer_nodes:
                prev_fingering = []
                if prev_node != "START":
                    prev_fingering = node_mapping[prev_node]
                
                trans_cost = calculate_transition_cost(prev_fingering, fingering)
                total_weight = static_cost + trans_cost
                
                # Edge weight = Cost of arriving at 'node_id' via 'prev_node'
                # (Static cost of current + Transition from prev)
                G.add_edge(prev_node, node_id, weight=total_weight)
                
            current_layer_nodes.append(node_id)
        
        if current_layer_nodes:
            prev_layer_nodes = current_layer_nodes

    G.add_node("END")
    for prev_node in prev_layer_nodes:
        G.add_edge(prev_node, "END", weight=0)

    # 3. Find Shortest Path
    try:
        path = nx.shortest_path(G, "START", "END", weight="weight")
    except nx.NetworkXNoPath:
        print("Optimization failed: No path found.")
        return notes

    # 4. Reconstruct Notes
    result_notes = []
    path_nodes = path[1:-1] # Skip START/END
    
    for i, node_id in enumerate(path_nodes):
        time_key = sorted_times[i]
        fingering = node_mapping[node_id] # [(s,f), (s,f)]
        
        # Map fingering back to notes in cluster by pitch matching
        fingering_map = {} 
        for s, f in fingering:
            p = OPEN_STRINGS[s] + f
            fingering_map[p] = (s, f)
            
        cluster = clusters[time_key]
        for note in cluster:
            if note['pitch'] in fingering_map:
                s, f = fingering_map[note['pitch']]
                new_note = note.copy()
                new_note['string'] = s
                new_note['fret'] = f
                result_notes.append(new_note)
            else:
                result_notes.append(note)

    return result_notes

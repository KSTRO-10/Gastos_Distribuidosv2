
file_path = "apps/orders/tests/test_procurement_to_inventory_e2e.py"
lines_to_ignore = [7, 16, 31, 32, 33, 34, 35, 51, 52, 53, 59, 64, 65, 93, 100, 112, 121, 134, 141, 152, 163, 183, 190]

with open(file_path, "r") as f:
    lines = f.readlines()

for idx in lines_to_ignore:
    # idx is 1-based, list is 0-based
    line = lines[idx-1]
    if "# type: ignore" not in line:
        lines[idx-1] = line.rstrip() + "  # type: ignore\n"

with open(file_path, "w") as f:
    f.writelines(lines)

print("Done")

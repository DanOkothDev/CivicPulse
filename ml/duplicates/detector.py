import math


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the distance between two GPS coordinates
    using the Haversine formula.

    Returns:
        Distance in metres.
    """

    earth_radius = 6_371_000  # metres

    lat1 = math.radians(lat1)
    lat2 = math.radians(lat2)

    difference_latitude = lat2 - lat1
    difference_longitude = math.radians(lon2 - lon1)

    a = (
        math.sin(difference_latitude / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(difference_longitude / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return earth_radius * c

if __name__ == "__main__":
    distance = calculate_distance(
        -1.28380,
        36.81740,
        -1.28420,
        36.81750
    )

    print(f"Distance: {distance:.2f} metres")
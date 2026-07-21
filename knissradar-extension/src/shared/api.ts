const API_BASE = "https://api.ouedkniss.com/graphql";

export async function fetchListingDetails(
  listingId: string
): Promise<unknown> {
  const query = `
    query AnnouncementGet($id: ID!) {
      announcement: announcementDetails(id: $id) {
        id
        title
        slug
        price
        pricePreview
        oldPrice
        category {
          id
          slug
          name
        }
        specs {
          specification {
            label
            codename
          }
          value
          valueText
        }
        cities {
          name
          region {
            name
            slug
          }
        }
        store {
          id
          name
          slug
          followerCount
          announcementsCount
        }
        createdAt
      }
    }
  `;

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "AnnouncementGet",
      variables: { id: listingId },
      query,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data.announcement;
}

export async function searchListings(
  categorySlug: string,
  page = 1,
  count = 60
): Promise<unknown> {
  const query = `
    query SearchQuery($filter: SearchFilterInput) {
      search(filter: $filter) {
        announcements {
          data {
            id
            title
            price
            pricePreview
            category {
              slug
            }
            cities {
              name
            }
          }
          paginatorInfo {
            lastPage
            hasMorePages
          }
        }
      }
    }
  `;

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationName: "SearchQuery",
      variables: {
        filter: {
          categorySlug,
          page,
          count,
        },
      },
      query,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.data.search;
}
